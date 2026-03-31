/**
 * 🎣 義方金魚王：及時排行系統後端 API (GAS)
 * 功能：處理報分、取得排行、重置全表
 * 
 * 使用說明：
 * 1. 在 Google 試算表中，點擊「擴充功能」 > 「Apps Script」
 * 2. 貼入此代碼並儲存專案 (命名為 FishKing_API)
 * 3. 點擊「部署」 > 「新部署」 > 選取「網頁應用程式」
 * 4. 執行身分設為「我」，誰可以存取設為「所有人」 (Anyone)
 * 5. 複製生成的 Web App URL 並填入前端 index.html 的 GAS_URL 變數中
 */

// --- [設定區] ---
var ADMIN_KEY = "1234"; // 這是您的管理密碼，用於「重置排行榜」功能

// --- [核心邏輯] ---

/**
 * 處理 GET 請求：回傳目前的排行榜 JSON
 */
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  // 如果試算表是空的，先建立標題並回傳空陣列
  if (data.length <= 1 && (data[0][0] === "" || data[0][0] === "PlayerName")) {
    if (data[0][0] === "") setupSheet();
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data.shift(); // 移除標題列
  
  // 將數據格式化為 JSON 對象
  var players = data.map(function(row) {
    return {
      name: row[0],
      count: parseInt(row[1]),
      timestamp: row[2],
      title: row[3]
    };
  });

  // 排序邏輯：
  // 1. 數量降序 (由大到小)
  // 2. 時間升序 (先達標者在前)
  players.sort(function(a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  // 回傳結果
  return ContentService.createTextOutput(JSON.stringify(players))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 POST 請求：接收前端指令 (報分、重置)
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params;
  
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("ERROR: Invalid JSON").setMimeType(ContentService.MimeType.TEXT);
  }

  var action = params.action;

  // 1. 報分功能
  if (action === "ADD_SCORE") {
    var title = calculateTitle(params.count);
    sheet.appendRow([
      params.name || "無名大師", 
      parseInt(params.count) || 0, 
      new Date().toISOString(), 
      title
    ]);
    return createResponse("SUCCESS");
  }

  // 2. 重置全表功能 (需要密碼)
  if (action === "RESET") {
    if (params.key === ADMIN_KEY) {
      sheet.clear();
      setupSheet();
      return createResponse("RESET_SUCCESS");
    } else {
      return createResponse("ERROR: Unauthorized (Wrong Admin Key)");
    }
  }

  return createResponse("ERROR: Unknown Action");
}

/**
 * 初始化試算表標題列
 */
function setupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow(["PlayerName", "FishCount", "Timestamp", "Title"]);
  // 設定標題列樣式 (深色背景、白色粗體)
  sheet.getRange(1, 1, 1, 4).setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold");
}

/**
 * 根據數量計算榮譽稱號 (連動系統)
 */
function calculateTitle(count) {
  if (count >= 100) return "👾 水缸終結者";
  if (count >= 51)  return "👑 義方金魚王";
  if (count >= 31)  return "🏅 夜市常客";
  if (count >= 11)  return "🎣 垂釣學徒";
  return "🌊 觀浪者";
}

/**
 * 輔助函式：建立回傳訊息
 */
function createResponse(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
