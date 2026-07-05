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
- `Password_Reset_Tokens`
- `Meta`

欄位命名已經直接對齊前端 `state` 結構，所以前端不用再做一層欄位轉換。

## 後端做了什麼

- `doGet(e)`
  - `action=health`：檢查設定是否正常
  - `action=bootstrap`：回傳完整 `state`
- `doPost(e)`
  - `action=setup`：建立工作表，可選 `seedDemo: true`
  - `action=login` / `registerLeader` / `registerMember` / `activatePending`
  - `action=saveState`：整包回寫目前前端 state
  - `action=uploadFile`：建立/續版繳交紀錄，並把 Drive 檔案搬到 `會審 / 小組` 資料夾
  - `action=reviewFile`：更新審核狀態並產生通知
  - `action=markNotificationsRead`
  - `action=clearNotifications`
  - `action=requestPasswordReset`：寄出密碼重設信
  - `action=previewPasswordReset`：驗證重設 token 是否有效
  - `action=resetPassword`：更新使用者密碼

## 部署步驟

1. 在 Apps Script 專案中放入 [Code.gs](</Users/james/Documents/Image Design/gas/Code.gs>) 和 [appsscript.json](</Users/james/Documents/Image Design/gas/appsscript.json>)。
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

## 請求範例

### 讀取完整狀態

```text
GET https://script.google.com/macros/s/你的部署ID/exec?action=bootstrap
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
  "userId": "U03",
  "fileName": "主視覺海報_定案V2.pdf",
  "googleDriveUrl": "https://drive.google.com/file/d/你的檔案ID/view"
}
```

### 審核檔案

```json
{
  "action": "reviewFile",
  "reviewerUserId": "U01",
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

## 前端對接建議

前端如果要最少改動，先走這兩條就夠了：

- 首次載入：呼叫 `GET action=bootstrap`
- 每次本地 state 有變更：呼叫 `POST action=saveState`

如果要把作業繳交流程切成真正的後端自動化，再把目前前端的假模擬上傳改成 `POST action=uploadFile`。

## 注意

- `uploadFile` 目前吃的是「Google Drive 檔案連結」，不是瀏覽器直接上傳二進位檔。
- GAS 必須對該 Drive 檔案有可編輯權限，才能搬移與重新命名。
- 如果前端頁面目前是直接用 `file://` 開啟，之後真接 Web App API 時，建議改成放在靜態站或同樣由 GAS/網頁伺服器提供，避免瀏覽器跨來源限制。
- 密碼重設信的連結會依據 `FRONTEND_BASE_URL` 組成；若沒設定，`requestPasswordReset` 會直接報錯。
