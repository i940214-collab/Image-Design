# GAS Backend

這一份是給目前 [index.html](</Users/james/Documents/Image Design/index.html>) 對接用的 Google Apps Script 後端。

## 會建立的工作表

- `Config_Stages`
- `Users`
- `Teams`
- `Purchase_Items`
- `Assignments`
- `Assignment_Submissions`
- `Files`
- `Notifications`
- `Discussion_Comments`
- `Password_Reset_Tokens`
- `Auth_Sessions`
- `Activity_Logs`
- `Meta`

欄位命名已經直接對齊前端 `state` 結構，所以前端不用再做一層欄位轉換。

## 後端做了什麼

- `doGet(e)`
  - `action=health`：檢查設定是否正常
  - `action=bootstrap`：驗證 session 後，依角色回傳可查看的 `state`
  - `action=largeUploadPage`：開啟大檔穩定上傳頁
- `doPost(e)`
  - `action=setup`：建立工作表，可選 `seedDemo: true`
  - `action=login` / `registerLeader` / `registerMember` / `activatePending`
  - `action=saveState`：以 `stateRevision` 防止舊畫面覆蓋其他人的新資料
- `action=uploadFile`：接收瀏覽器直傳檔案，建立/續版繳交紀錄，並自動存到 `會審 / 小組` 資料夾
- `action=uploadAssignmentAsset`：接收公告作業直傳檔案，並自動存到 `會審 / 小組 / 公告作業 / 作業標題` 資料夾
  - `action=reviewFile`：更新審核狀態並產生通知
  - `action=markNotificationsRead`
  - `action=clearNotifications`
  - `action=requestPasswordReset`：寄出密碼重設信
  - `action=previewPasswordReset`：驗證重設 token 是否有效
- `action=resetPassword`：更新使用者密碼
- `action=getActivityLogs`：讀取操作紀錄，僅限形印組長與形印組員

## 登入與同步安全

- 登入成功後，GAS 會簽發 12 小時有效的隨機 session token；試算表只保存 token 雜湊值，不保存原始 token。
- 每個帳號最多保留 5 個有效 session；超出時最早的 session 會自動撤銷。
- 密碼重設後，該帳號所有既有 session 都會立即失效。
- 連續輸入錯誤密碼 5 次時，登入會暫時限制 10 分鐘。
- 新註冊與重設密碼至少需 8 碼；既有帳號可登入後再透過重設流程更新為新密碼。
- 所有資料讀取、寫入、上傳、審核與通知操作都會由後端 session 判斷登入身分，不採信前端傳來的 `userId`。
- 形印組長與組員可看完整工作資料；小組帳號只能取得自身小組、被指派的繳交項目與自己的通知。
- 每一次 `saveState` 都必須帶回最後一次讀取到的 `stateRevision`。版本不一致時會回傳 `STATE_CONFLICT`，前端會重新載入雲端資料，而不會覆蓋他人的更新。

## 操作紀錄

- 系統會記錄重要的會審期數、預算／印刷品、繳交項目、檔案繳交、檔案審核與帳號異動。
- 每筆紀錄包含操作時間、操作人、角色、動作、摘要與對象類型；不會寫入密碼或檔案內容。
- 操作紀錄不會放進一般 `bootstrap` 的前端 state。只有形印組長與形印組員帶著有效登入 session 才能讀取。
- 紀錄預設最多保留最近 `1,000` 筆，超過時會自動移除最舊資料。

## 背景自動催交

這版已加入 GAS 背景排程提醒：

- 不需要有人開著網站
- 由 GAS installable trigger 每小時自動掃描一次
- 針對「尚未繳交」的小組發送：
  - 站內通知
  - Email 催交提醒
- 預設提醒節點：
  - 截止前 `72` 小時
  - 截止前 `24` 小時
  - 截止前 `6` 小時
  - 截止後第一次掃描時補一封逾期提醒

提醒紀錄會寫進 `Meta.AssignmentReminderLog`，避免同一個節點重複寄送。

## 部署步驟

1. 在 Apps Script 專案中放入 [Code.gs](</Users/james/Documents/Image Design/gas/Code.gs>)、[LargeUpload.html](</Users/james/Documents/Image Design/gas/LargeUpload.html>) 和 [appsscript.json](</Users/james/Documents/Image Design/gas/appsscript.json>)。
2. 建立一份 Google 試算表，記下 Spreadsheet ID。
3. 在 Google Drive 建立一個總資料夾，作為所有會審檔案的根目錄，記下 Folder ID。
4. 在 Apps Script 執行：

```javascript
saveScriptConfig('你的 Spreadsheet ID', '你的 Drive Root Folder ID', {
  frontendBaseUrl: '你的前端網址',
  mailSenderName: '畢展形印組管理系統',
  mailReplyTo: '你的回覆信箱@example.com',
  mailFromAlias: '',
  passwordResetExpiryMinutes: 30
});
setupSheets();
authorizeMailScope();
enableAssignmentReminderAutomation();
```

`frontendBaseUrl` 請填你實際開啟這個前端頁面的網址，例如：

- `https://你的網域/index.html`
- `http://127.0.0.1:5500/index.html`

目前這份部署預設使用 `MailApp` 寄信，所以支援 `mailSenderName`、`mailReplyTo`，但不啟用 `mailFromAlias`。如果 `MAIL_FROM_ALIAS` 有填值，重設密碼寄信會直接報錯。

5. 如果你要先用現在前端的假資料測試，再執行：

```javascript
seedDemoData();
```

6. 部署成 Web App。
   - Execute as: `Me`
   - Who has access: `Anyone`

   `Anyone` 只代表瀏覽器能呼叫 Web App；實際資料仍需通過本系統的帳密、session 與角色權限驗證。

7. 第一次完成授權後，請確認背景 trigger 已建立。
   你可以在 Apps Script 執行：

```javascript
listAssignmentReminderTriggers();
```

若要重裝 trigger，可執行：

```javascript
installAssignmentReminderTrigger();
```

若要暫停背景催交：

```javascript
disableAssignmentReminderAutomation();
```

## 請求範例

### 登入後讀取可用狀態

```text
GET https://script.google.com/macros/s/你的部署ID/exec?action=bootstrap&sessionToken=登入後取得的sessionToken
```

### 初始化工作表

```json
{
  "action": "setup",
  "seedDemo": true
}
```

### 上傳檔案紀錄並自動分類資料夾

```json
{
  "action": "uploadFile",
  "sessionToken": "登入後取得的sessionToken",
  "fileName": "主視覺海報_定案V2.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1048576,
  "fileContentBase64": "JVBERi0xLjQKJ..."
}
```

### 審核檔案

```json
{
  "action": "reviewFile",
  "sessionToken": "登入後取得的sessionToken",
  "fileId": "F02",
  "status": "退件",
  "comment": "請改為 CMYK 並確認出血線。"
}
```

### 申請重設密碼

```json
{
  "action": "requestPasswordReset",
  "email": "member@test.com"
}
```

### 驗證重設連結

```json
{
  "action": "previewPasswordReset",
  "token": "從信件連結帶進來的 token"
}
```

### 更新密碼

```json
{
  "action": "resetPassword",
  "token": "從信件連結帶進來的 token",
  "password": "new-password"
}
```

### 讀取操作紀錄（形印組限定）

```json
{
  "action": "getActivityLogs",
  "sessionToken": "登入後取得的sessionToken",
  "limit": 100
}
```

## 前端對接建議

前端如果要最少改動，先走這兩條就夠了：

- 登入成功後：保存回傳的 `sessionToken`
- 首次載入：帶著 `sessionToken` 呼叫 `GET action=bootstrap`
- 每次本地 state 有變更：呼叫 `POST action=saveState`，並帶上最近回傳的 `stateRevision`

如果要把一般檔案收件和公告作業都接到雲端，目前直接用：

- `POST action=uploadFile`
- `POST action=uploadAssignmentAsset`
- `GET action=largeUploadPage`：給 18 MB 以上的大檔改走穩定上傳頁

## 注意

- `uploadFile` / `uploadAssignmentAsset` 現在吃的是瀏覽器直傳的 base64 二進位內容，不再需要先貼 Google Drive 連結。
- 主頁目前維持單檔 `18 MB` 內直傳；超過 `18 MB` 時，前端會改開 `largeUploadPage`，由 GAS HTML Service 走較穩定的上傳頁流程，最高約 `50 MB`。
- 公告作業的背景催交信目前會沿用作業上的 `Notify_By_Email` 設定；若該公告建立時有勾選寄送 Email，後續背景提醒也會一起寄出。
- 如果前端頁面目前是直接用 `file://` 開啟，之後真接 Web App API 時，建議改成放在靜態站或同樣由 GAS/網頁伺服器提供，避免瀏覽器跨來源限制。
- 密碼重設信的連結會依據 `FRONTEND_BASE_URL` 組成；若沒設定，`requestPasswordReset` 會直接報錯。
- 本次部署會自動建立 `Discussion_Comments` 與 `Auth_Sessions` 工作表；現有使用者的舊前端登入快取會失效，需重新登入一次。
