/**
 * ZAHA HADID ATLAS — Tribute 後端(Google Apps Script)
 * 配合 zaha-hadid-atlas.html 的 GAS_ENDPOINT 使用
 *
 * 部署步驟(妳的老路):
 * 1. 建一個新的 Google Sheet,開啟 擴充功能 → Apps Script,貼上本檔
 * 2. 第一次執行 setup() 授權,會自動建立「messages」「votes」兩個工作表
 * 3. 部署 → 新增部署 → 網頁應用程式
 *    - 執行身分:我
 *    - 誰可以存取:所有人
 * 4. 複製 Web App URL,貼到 HTML 裡的 GAS_ENDPOINT = '...'
 */

const SHEET_MSG = 'messages';
const SHEET_VOTE = 'votes';
const SHEET_VISIT = 'visits';   // 匿名「親訪打卡」彙總
const MAX_MESSAGES = 500;

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_MSG)) {
    ss.insertSheet(SHEET_MSG).appendRow(['ts', 'name', 'text', 'work']);
  }
  if (!ss.getSheetByName(SHEET_VOTE)) {
    ss.insertSheet(SHEET_VOTE).appendRow(['work', 'count']);
  }
  if (!ss.getSheetByName(SHEET_VISIT)) {
    ss.insertSheet(SHEET_VISIT).appendRow(['work', 'count']);
  }
}

function doGet(e) {
  const action = (e.parameter.action || 'state');
  if (action === 'state') {
    return json_({ votes: readVotes_(), messages: readMessages_() });
  }
  return json_({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents || '{}');

    if (body.action === 'vote') {
      const work = parseInt(body.work, 10);
      if (isNaN(work) || work < 0 || work > 200) return json_({ ok: false });
      bumpVote_(work);
      return json_({ ok: true, votes: readVotes_() });
    }

    if (body.action === 'message') {
      const name = String(body.n || '匿名').slice(0, 24);
      const text = String(body.t || '').slice(0, 200).trim();
      if (!text) return json_({ ok: false });
      const work = (body.w === null || body.w === undefined) ? '' : parseInt(body.w, 10);
      const ts = Date.now();
      const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MSG);
      sh.insertRowAfter(1);
      sh.getRange(2, 1, 1, 4).setValues([[ts, name, text, work]]);
      // 控制總量
      const rows = sh.getLastRow();
      if (rows - 1 > MAX_MESSAGES) sh.deleteRows(MAX_MESSAGES + 2, rows - 1 - MAX_MESSAGES);
      return json_({ ok: true });
    }

    if (body.action === 'checkin') {
      const work = parseInt(body.work, 10);
      const delta = body.delta === -1 ? -1 : 1;
      if (isNaN(work) || work < 0 || work > 200) return json_({ ok: false });
      bumpCount_(SHEET_VISIT, work, delta);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'unknown action' });
  } finally {
    lock.releaseLock();
  }
}

function bumpVote_(work) {
  bumpCount_(SHEET_VOTE, work, 1);
}

function bumpCount_(sheetName, work, delta) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sh.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (Number(data[r][0]) === work) {
      sh.getRange(r + 1, 2).setValue(Math.max(0, Number(data[r][1]) + delta));
      return;
    }
  }
  sh.appendRow([work, Math.max(0, delta)]);
}

function readVotes_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VOTE);
  const data = sh.getDataRange().getValues();
  const out = {};
  for (let r = 1; r < data.length; r++) {
    out[Number(data[r][0])] = Number(data[r][1]);
  }
  return out;
}

function readMessages_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MSG);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const data = sh.getRange(2, 1, last - 1, 4).getValues();
  return data.map(function (r) {
    return {
      ts: Number(r[0]),
      n: String(r[1]),
      t: String(r[2]),
      w: r[3] === '' ? null : Number(r[3])
    };
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
