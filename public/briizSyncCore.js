const DEFAULT_NOTE_PANEL_SIZE = Object.freeze({ x: 180, y: 180, w: 300, h: 360 });

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value, fallback = '') {
  return value == null ? fallback : String(value);
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stringArray(value) {
  return Array.isArray(value) ? value.map(item => String(item)) : [];
}

function cleanUndefined(value) {
  const out = {};
  Object.keys(value || {}).forEach(key => {
    if (value[key] !== undefined) out[key] = value[key];
  });
  return out;
}

function xywhFrom(value, fallback = DEFAULT_NOTE_PANEL_SIZE) {
  const source = isRecord(value) ? value : {};
  return {
    x: numberValue(source.x, fallback.x),
    y: numberValue(source.y, fallback.y),
    w: numberValue(source.w, fallback.w),
    h: numberValue(source.h, fallback.h),
  };
}

function readBranch(raw, branch) {
  const ui = isRecord(raw.ui) ? raw.ui : {};
  const branchValue = isRecord(ui[branch]) ? ui[branch] : {};
  return isRecord(branchValue.xywh) ? xywhFrom(branchValue.xywh) : null;
}

function legacyPanelBranch(raw) {
  return xywhFrom({
    x: raw.x ?? raw.position_x ?? raw.positionX,
    y: raw.y ?? raw.position_y ?? raw.positionY,
    w: raw.w ?? raw.width,
    h: raw.h ?? raw.height,
  });
}

function normalizeOrganizerDoc(id, raw) {
  const data = isRecord(raw) ? raw : {};
  const title = stringValue(data.title ?? data.name ?? data.text);
  const body = stringValue(data.body ?? data.description ?? data.content);
  return cleanUndefined({
    ...data,
    id: stringValue(data.id ?? id),
    type: stringValue(data.type, 'note'),
    title,
    body,
    status: stringValue(data.status, data.completedAt ? 'done' : 'todo'),
    completed: Boolean(data.completed || data.completedAt || data.status === 'done'),
    completedAt: data.completedAt ?? null,
    customColor: data.customColor ?? data.color ?? null,
    tags: stringArray(data.tags),
    panelId: data.panelId == null ? null : String(data.panelId),
    panelType: data.panelType == null ? null : String(data.panelType),
    createdAt: numberValue(data.createdAt ?? data.created, Date.now()),
    updatedAt: data.updatedAt,
  });
}

function normalizePanelDoc(id, raw) {
  const data = isRecord(raw) ? raw : {};
  const legacy = legacyPanelBranch(data);
  const web = readBranch(data, 'web');
  const local = readBranch(data, 'local');
  const mobile = readBranch(data, 'mobile');
  return cleanUndefined({
    ...data,
    id: stringValue(data.id ?? id),
    type: stringValue(data.type, 'note'),
    orgId: data.orgId == null ? null : String(data.orgId),
    active: data.active !== false,
    isDocked: data.isDocked !== false,
    autoHeight: data.autoHeight !== false,
    expansionCount: numberValue(data.expansionCount, 0),
    ui: {
      ...(isRecord(data.ui) ? data.ui : {}),
      web: { xywh: web ?? legacy },
      local: { xywh: local ?? legacy },
      ...(mobile ? { mobile: { xywh: mobile } } : {}),
    },
    createdAt: numberValue(data.createdAt, Date.now()),
    updatedAt: data.updatedAt,
  });
}

function composeRenderablePanel(organizerItem, panelDoc, platform = 'web') {
  const ui = isRecord(panelDoc.ui) ? panelDoc.ui : {};
  const branch = isRecord(ui[platform]) && isRecord(ui[platform].xywh)
    ? xywhFrom(ui[platform].xywh)
    : xywhFrom(ui.web && ui.web.xywh ? ui.web.xywh : ui.local && ui.local.xywh);
  return cleanUndefined({
    ...panelDoc,
    ...branch,
    orgId: organizerItem.id,
    id: panelDoc.id,
    type: organizerItem.panelType || panelDoc.type || organizerItem.type,
    title: organizerItem.title,
    body: organizerItem.body,
    content: organizerItem.body,
    customColor: organizerItem.customColor ?? null,
    tags: organizerItem.tags || [],
    active: panelDoc.active !== false,
    organizerItem,
  });
}

function readBriizSyncState(input = {}) {
  const platform = input.platform || 'web';
  const organizerDocs = Array.isArray(input.organizerDocs) ? input.organizerDocs : [];
  const panelDocs = Array.isArray(input.panelDocs) ? input.panelDocs : [];
  const organizer = organizerDocs.map(doc => normalizeOrganizerDoc(doc.id, doc.data ?? doc));
  const panels = panelDocs.map(doc => normalizePanelDoc(doc.id, doc.data ?? doc));
  const organizerById = new Map(organizer.map(item => [String(item.id), item]));
  const panelsById = new Map(panels.map(panel => [String(panel.id), panel]));
  const notes = organizer.filter(item => item.type === 'note');
  const renderablePanels = [];
  const missingPanelItems = [];

  organizer.forEach(item => {
    if (!item.panelId) return;
    const panel = panelsById.get(String(item.panelId));
    if (!panel) {
      missingPanelItems.push(item);
      return;
    }
    if (panel.orgId && String(panel.orgId) !== String(item.id)) return;
    renderablePanels.push(composeRenderablePanel(item, panel, platform));
  });

  const orphanPanels = panels.filter(panel => !panel.orgId || !organizerById.has(String(panel.orgId)));
  return { organizer, panels, notes, renderablePanels, orphanPanels, missingPanelItems };
}

function serverStamp(input) {
  if (typeof input.serverTimestamp === 'function') return input.serverTimestamp();
  return input.serverTimestampValue ?? null;
}

function makeOp(kind, path, data, options) {
  return cleanUndefined({ kind, path, data, options });
}

function makeOrganizerDoc(input, now, stamp) {
  const data = input.data || {};
  const id = stringValue(input.itemId || data.id);
  return cleanUndefined({
    id,
    type: stringValue(data.type, 'note'),
    title: stringValue(data.title ?? data.name, 'Untitled note'),
    body: stringValue(data.body ?? data.content ?? data.description),
    status: stringValue(data.status, 'todo'),
    completed: Boolean(data.completed),
    completedAt: data.completedAt ?? null,
    customColor: data.customColor ?? data.color ?? null,
    tags: stringArray(data.tags),
    panelId: input.panelId || data.panelId || null,
    panelType: input.panelType || data.panelType || (data.type === 'event' ? null : stringValue(data.type, 'note')),
    scheduledDate: data.scheduledDate ?? null,
    due: data.due ?? null,
    dateMode: data.dateMode ?? (data.type === 'event' ? 'event' : 'created'),
    dateValue: data.dateValue ?? data.scheduledDate ?? null,
    source: data.source ?? { mode: input.source || 'syncCore' },
    chat: data.chat ?? null,
    external: data.external ?? null,
    recurrence: data.recurrence ?? null,
    createdAt: numberValue(data.createdAt, now),
    updatedAt: stamp,
  });
}

function makeOrganizerPatch(input, stamp) {
  const data = input.data || {};
  const patch = {
    id: stringValue(input.itemId || data.id),
    updatedAt: stamp,
  };
  if (data.type !== undefined) patch.type = stringValue(data.type, 'note');
  if (data.title !== undefined || data.name !== undefined || data.text !== undefined) {
    patch.title = stringValue(data.title ?? data.name ?? data.text);
  }
  if (data.body !== undefined || data.content !== undefined || data.description !== undefined) {
    patch.body = stringValue(data.body ?? data.content ?? data.description);
  }
  if (data.status !== undefined) patch.status = stringValue(data.status, 'todo');
  if (data.completed !== undefined) patch.completed = Boolean(data.completed);
  if (data.completedAt !== undefined) patch.completedAt = data.completedAt;
  if (data.customColor !== undefined || data.color !== undefined) patch.customColor = data.customColor ?? data.color ?? null;
  if (data.tags !== undefined) patch.tags = stringArray(data.tags);
  if (data.panelId !== undefined || input.panelId !== undefined) patch.panelId = input.panelId || data.panelId || null;
  if (data.panelType !== undefined || input.panelType !== undefined) patch.panelType = input.panelType || data.panelType || null;
  if (data.scheduledDate !== undefined) patch.scheduledDate = data.scheduledDate;
  if (data.due !== undefined) patch.due = data.due;
  if (data.dateMode !== undefined) patch.dateMode = data.dateMode;
  if (data.dateValue !== undefined) patch.dateValue = data.dateValue;
  if (data.source !== undefined) patch.source = data.source;
  if (data.chat !== undefined) patch.chat = data.chat;
  if (data.external !== undefined) patch.external = data.external;
  if (data.recurrence !== undefined) patch.recurrence = data.recurrence;
  return cleanUndefined(patch);
}

function makePanelDoc(input, now, stamp) {
  const data = input.data || {};
  const panelId = stringValue(input.panelId || data.panelId || data.id);
  const orgId = stringValue(input.itemId || data.orgId);
  if (!orgId) throw new Error('Panel writes require orgId/itemId.');
  const platform = input.platform || 'web';
  const xywh = xywhFrom(data.ui && data.ui[platform] && data.ui[platform].xywh ? data.ui[platform].xywh : data.xywh || data);
  return cleanUndefined({
    id: panelId,
    type: stringValue(input.panelType || data.panelType || data.type, 'note'),
    orgId,
    active: data.active !== false,
    isDocked: data.isDocked,
    autoHeight: data.autoHeight,
    expansionCount: data.expansionCount,
    ui: {
      [platform]: { xywh },
    },
    chat: data.chat,
    externalUrl: data.externalUrl,
    externalShowUrl: data.externalShowUrl,
    externalData: data.externalData,
    subtype: data.subtype,
    createdAt: numberValue(data.createdAt, now),
    updatedAt: stamp,
  });
}

function prepareBriizSyncWrite(input = {}) {
  const now = numberValue(input.now, Date.now());
  const stamp = serverStamp(input);
  const uid = input.uid || '{uid}';
  const action = input.action || 'update';
  const entity = input.entity || 'note';
  const itemId = stringValue(input.itemId || input.data && input.data.id);
  const panelId = stringValue(input.panelId || input.data && (input.data.panelId || input.data.id));
  const ops = [];

  if (entity === 'note' && action === 'delete') {
    if (!itemId) throw new Error('Deleting a note requires itemId.');
    ops.push(makeOp('delete', `users/${uid}/organizer/${itemId}`));
    if (panelId) ops.push(makeOp('delete', `users/${uid}/panels/${panelId}`));
    return ops;
  }

  if (entity === 'note' && action === 'create') {
    const nextItemId = itemId || `note_${now}`;
    const nextPanelId = panelId || `panel_${nextItemId}`;
    ops.push(makeOp('set', `users/${uid}/organizer/${nextItemId}`, makeOrganizerDoc({
      ...input,
      itemId: nextItemId,
      panelId: nextPanelId,
      panelType: input.panelType || 'note',
    }, now, stamp), { merge: true }));
    ops.push(makeOp('set', `users/${uid}/panels/${nextPanelId}`, makePanelDoc({
      ...input,
      itemId: nextItemId,
      panelId: nextPanelId,
      panelType: input.panelType || 'note',
    }, now, stamp), { merge: true }));
    return ops;
  }

  if (entity === 'note' && action === 'update') {
    if (!itemId) throw new Error('Updating a note requires itemId.');
    ops.push(makeOp('set', `users/${uid}/organizer/${itemId}`, makeOrganizerPatch(input, stamp), { merge: true }));
    return ops;
  }

  if (entity === 'panel') {
    if (!panelId) throw new Error('Panel writes require panelId.');
    ops.push(makeOp('set', `users/${uid}/panels/${panelId}`, makePanelDoc(input, now, stamp), { merge: true }));
    return ops;
  }

  if (entity === 'organizer') {
    if (!itemId) throw new Error('Organizer writes require itemId.');
    if (action === 'delete') return [makeOp('delete', `users/${uid}/organizer/${itemId}`)];
    const data = action === 'create' ? makeOrganizerDoc(input, now, stamp) : makeOrganizerPatch(input, stamp);
    ops.push(makeOp('set', `users/${uid}/organizer/${itemId}`, data, { merge: true }));
    return ops;
  }

  throw new Error(`Unsupported sync write: ${entity}/${action}`);
}

export {
  readBriizSyncState,
  prepareBriizSyncWrite,
  normalizeOrganizerDoc,
  normalizePanelDoc,
  composeRenderablePanel,
};
