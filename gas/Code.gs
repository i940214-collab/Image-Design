var APP_DEFAULTS = {
  timeZone: 'Asia/Taipei',
  spreadsheetId: 'PUT_SPREADSHEET_ID_HERE',
  driveRootFolderId: 'PUT_DRIVE_ROOT_FOLDER_ID_HERE',
  frontendBaseUrl: 'https://visual-design-tw.github.io/Image-Design/',
  mailSenderName: '畢展形印組管理系統',
  mailReplyTo: '',
  mailFromAlias: '',
  passwordResetExpiryMinutes: 30
};

var SUPPORTED_UPLOAD_EXTENSIONS = ['.ai', '.pdf', '.psd', '.indd', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.zip'];
var MAX_BROWSER_UPLOAD_SIZE_BYTES = 18 * 1024 * 1024;
var MAX_STABLE_WEBAPP_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
var ASSIGNMENT_REMINDER_TRIGGER_HANDLER = 'runScheduledAssignmentReminders';
var ASSIGNMENT_REMINDER_LOG_META_KEY = 'AssignmentReminderLog';
var ASSIGNMENT_REMINDER_SETTINGS_META_KEY = 'AssignmentReminderSettings';
var ASSIGNMENT_REMINDER_DEFAULT_OFFSETS_HOURS = [72, 24, 6];
var ACTIVITY_LOG_MAX_RECORDS = 1000;
var AUTH_SESSION_TTL_HOURS = 12;
var AUTH_SESSION_MAX_PER_USER = 5;
var AUTH_LOGIN_MAX_ATTEMPTS = 5;
var AUTH_LOGIN_LOCKOUT_SECONDS = 10 * 60;
var MIN_PASSWORD_LENGTH = 8;

var TABLE_SCHEMAS = {
  Config_Stages: {
    headers: ['Stage_ID', 'Stage_Name', 'Budget_Allocated', 'Is_Active'],
    types: {
      Budget_Allocated: 'number',
      Is_Active: 'boolean'
    }
  },
  Users: {
    headers: ['User_ID', 'Email', 'Password', 'Name', 'Team_ID', 'Role', 'Status'],
    types: {}
  },
  Teams: {
    headers: ['Team_ID', 'Team_Name', 'Invite_Code'],
    types: {}
  },
  Purchase_Items: {
    headers: ['Item_ID', 'Stage_ID', 'Item_Name', 'Vendor_Price', 'Quantity', 'Subtotal', 'Created_At'],
    types: {
      Vendor_Price: 'number',
      Quantity: 'number',
      Subtotal: 'number'
    }
  },
  Assignments: {
    headers: [
      'Assignment_ID',
      'Stage_ID',
      'Title',
      'Body',
      'Submission_Mode',
      'Requirement_Text',
      'Target_Mode',
      'Target_Team_IDs',
      'Due_At',
      'Created_At',
      'Created_By_User_ID',
      'Status',
      'Allow_ReSubmit',
      'Notify_By_Email',
      'Email_Notification_Sent'
    ],
    types: {
      Target_Team_IDs: 'json',
      Allow_ReSubmit: 'boolean',
      Notify_By_Email: 'boolean',
      Email_Notification_Sent: 'boolean'
    }
  },
  Assignment_Submissions: {
    headers: [
      'Submission_ID',
      'Assignment_ID',
      'User_ID',
      'Team_ID',
      'Submission_No',
      'Submission_Mode',
      'File_Name',
      'Google_Drive_URL',
      'Text_Content',
      'Submitted_At',
      'Updated_At',
      'Status',
      'Notes',
      'Drive_File_ID',
      'Drive_Folder_ID'
    ],
    types: {
      Submission_No: 'number'
    }
  },
  Files: {
    headers: [
      'File_ID',
      'Stage_ID',
      'Team_ID',
      'File_Name',
      'Google_Drive_URL',
      'Upload_Time',
      'Check_Status',
      'Comment',
      'Base_File_Name',
      'File_Extension',
      'Version_No',
      'File_Group_Key',
      'Revision_Notes',
      'Drive_File_ID',
      'Drive_Folder_ID'
    ],
    types: {
      Version_No: 'number'
    }
  },
  Notifications: {
    headers: [
      'Notification_ID',
      'User_ID',
      'Type',
      'Title',
      'Message',
      'Created_At',
      'Read',
      'Tab',
      'Ref_Type',
      'Ref_ID',
      'Priority'
    ],
    types: {
      Read: 'boolean'
    }
  },
  Discussion_Comments: {
    headers: [
      'Comment_ID',
      'Ref_Type',
      'Ref_ID',
      'User_ID',
      'Team_ID',
      'Author_Name',
      'Author_Role',
      'Kind',
      'Message',
      'Created_At'
    ],
    types: {}
  },
  Password_Reset_Tokens: {
    headers: [
      'Reset_ID',
      'User_ID',
      'Email',
      'Token_Hash',
      'Requested_At',
      'Expires_At',
      'Consumed_At',
      'Status',
      'Requested_At_Millis',
      'Expires_At_Millis',
      'Consumed_At_Millis'
    ],
    types: {
      Requested_At_Millis: 'number',
      Expires_At_Millis: 'number',
      Consumed_At_Millis: 'number'
    }
  },
  Auth_Sessions: {
    headers: [
      'Session_ID',
      'User_ID',
      'Token_Hash',
      'Created_At',
      'Expires_At',
      'Last_Seen_At',
      'Revoked_At',
      'Expires_At_Millis'
    ],
    types: {
      Expires_At_Millis: 'number'
    }
  },
  Activity_Logs: {
    headers: [
      'Log_ID',
      'Created_At',
      'Actor_User_ID',
      'Actor_Name',
      'Actor_Role',
      'Action',
      'Summary',
      'Target_Type',
      'Target_ID',
      'Severity',
      'Metadata'
    ],
    types: {
      Metadata: 'json'
    }
  },
  Meta: {
    headers: ['Key', 'Value'],
    types: {
      Value: 'json'
    }
  }
};

function doGet(e) {
  try {
    var action = getAction_(e, {});

    if (action === 'health') {
      return jsonResponse_(true, buildHealthPayload_());
    }

    if (action === 'bootstrap' || action === 'state' || action === 'init') {
      return jsonResponse_(true, handleBootstrap_(e && e.parameter ? e.parameter : {}));
    }

    if (action === 'largeUploadPage') {
      try {
        return renderLargeUploadPage_(e);
      } catch (pageError) {
        return renderLargeUploadErrorPage_(pageError);
      }
    }

    throw new Error('Unsupported GET action: ' + action);
  } catch (error) {
    return jsonResponse_(false, null, error);
  }
}

function doPost(e) {
  try {
    var payload = parsePayload_(e);
    var action = getAction_(e, payload);
    var result;

    if (action === 'bootstrap' || action === 'state') {
      result = handleBootstrap_(payload);
      return jsonResponse_(true, result);
    }

    if (action === 'login') {
      result = withLock_(function() {
        return handleLogin_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'registerLeader') {
      result = withLock_(function() {
        return handleRegisterLeader_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'registerMember') {
      result = withLock_(function() {
        return handleRegisterMember_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'activatePending') {
      result = withLock_(function() {
        return handleActivatePending_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'requestPasswordReset') {
      result = withLock_(function() {
        return handleRequestPasswordReset_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'previewPasswordReset') {
      result = withLock_(function() {
        return handlePreviewPasswordReset_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'resetPassword') {
      result = withLock_(function() {
        return handleResetPassword_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'setup') {
      result = withLock_(function() {
        var setupState = loadState_();
        var setupUser = requireSessionUser_(setupState, payload, ['SuperAdmin']);
        setupSheets_();
        if (payload.seedDemo === true) {
          persistState_(buildDemoState_());
        }
        return buildClientStateResultForUser_(loadState_(), setupUser);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'saveState') {
      result = withLock_(function() {
        return handleSaveState_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'deletePurchaseItem') {
      result = withLock_(function() {
        return handleDeletePurchaseItem_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'getActivityLogs') {
      result = handleGetActivityLogs_(payload);
      return jsonResponse_(true, result);
    }

    if (action === 'logout') {
      result = withLock_(function() {
        return handleLogoutSession_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'uploadFile') {
      result = withLock_(function() {
        return handleUploadFile_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'uploadAssignmentAsset') {
      result = withLock_(function() {
        return handleUploadAssignmentAsset_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'reviewFile') {
      result = withLock_(function() {
        return handleReviewFile_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'markNotificationsRead') {
      result = withLock_(function() {
        return handleMarkNotificationsRead_(payload);
      });
      return jsonResponse_(true, result);
    }

    if (action === 'clearNotifications') {
      result = withLock_(function() {
        return handleClearNotifications_(payload);
      });
      return jsonResponse_(true, result);
    }

    throw new Error('Unsupported POST action: ' + action);
  } catch (error) {
    return jsonResponse_(false, null, error);
  }
}

function renderLargeUploadPage_(e) {
  var template = HtmlService.createTemplateFromFile('LargeUpload');
  template.pageModel = buildLargeUploadPageModel_(e && e.parameter ? e.parameter : {});
  return template.evaluate()
    .setTitle('形印組穩定上傳')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function renderLargeUploadErrorPage_(error) {
  var message = error && error.message ? error.message : '無法開啟穩定上傳頁。';
  var safeMessage = String(message).replace(/[<>&"']/g, function(char) {
    return {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });

  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>穩定上傳頁</title>' +
    '<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang TC","Noto Sans TC",sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.card{max-width:460px;width:100%;background:#fff;border:1px solid #e5e5ea;border-radius:28px;padding:28px;box-shadow:0 16px 48px rgba(15,23,42,.08)}h1{font-size:24px;margin:0 0 10px}p{margin:0;color:#6e6e73;line-height:1.7}</style>' +
    '</head><body><div class="card"><h1>無法開啟穩定上傳頁</h1><p>' + safeMessage + '</p></div></body></html>'
  );
}

function buildLargeUploadPageModel_(params) {
  var mode = String(params.mode || '').trim();
  if (['file', 'assignment-asset'].indexOf(mode) === -1) {
    throw new Error('穩定上傳頁缺少正確的 mode 參數。');
  }

  var state = loadState_();
  var userId = String(params.userId || '').trim();
  var teamId = String(params.teamId || '').trim();
  var stageId = String(params.stageId || '').trim();
  var assignmentId = String(params.assignmentId || '').trim();
  var sourceFileName = String(params.sourceFileName || '').trim();
  var parsedSource = parseFileMeta_(sourceFileName || 'upload.bin');
  var baseName = String(params.baseName || parsedSource.baseName || '').trim();
  var extension = String(params.extension || parsedSource.extension || '').trim();
  var sessionKey = String(params.sessionKey || '').trim();
  var groupKey = String(params.groupKey || '').trim();

  var currentUser = requireStudentUploadActor_(state, params);
  if (userId && userId !== String(currentUser.User_ID || '')) {
    throw new Error('FORBIDDEN: 穩定上傳頁的使用者資訊不符。');
  }
  if (teamId && teamId !== String(currentUser.Team_ID || '')) {
    throw new Error('FORBIDDEN: 穩定上傳頁的小組資訊不符。');
  }
  userId = String(currentUser.User_ID || '');
  teamId = String(currentUser.Team_ID || '');
  var team = ensureArray_(state.Teams).find(function(item) {
    return String(item.Team_ID || '') === teamId;
  }) || null;
  var assignment = ensureArray_(state.Assignments).find(function(item) {
    return String(item.Assignment_ID || '') === assignmentId;
  }) || null;
  var stage = ensureArray_(state.Config_Stages).find(function(item) {
    return String(item.Stage_ID || '') === stageId;
  }) || null;

  if (mode === 'file') {
    if (!team || team.Team_ID === 'T00') {
      throw new Error('只有正式小組可以使用一般檔案收件上傳。');
    }
    if (!stage) {
      stage = ensureArray_(state.Config_Stages).find(function(item) {
        return item.Is_Active === true;
      }) || null;
    }
    if (!stage) {
      throw new Error('找不到目前作用中的會審期數。');
    }
  }

  if (mode === 'assignment-asset') {
    if (!team || team.Team_ID === 'T00') {
      throw new Error('只有正式小組可以使用繳交項目上傳。');
    }
    if (!assignment) {
      throw new Error('找不到指定的繳交項目。');
    }
    if (!isAssignmentVisibleToTeam_(state, assignment, teamId)) {
      throw new Error('FORBIDDEN: 這份作業不在你的繳交範圍內。');
    }
    if (!stage) {
      stage = ensureArray_(state.Config_Stages).find(function(item) {
        return String(item.Stage_ID || '') === String(assignment.Stage_ID || '');
      }) || null;
    }
  }

  var pathSegments = mode === 'assignment-asset'
    ? [stage ? stage.Stage_Name : '', team ? team.Team_Name : '', '公告作業', assignment ? assignment.Title : '']
    : [stage ? stage.Stage_Name : '', team ? team.Team_Name : ''];
  var pathLabel = pathSegments.filter(function(segment) {
    return String(segment || '').trim();
  }).join(' / ');

  return {
    mode: mode,
    sessionToken: String(params.sessionToken || '').trim(),
    sessionKey: sessionKey,
    userId: userId,
    teamId: teamId,
    stageId: stage ? String(stage.Stage_ID || '') : stageId,
    assignmentId: assignmentId,
    groupKey: groupKey,
    baseName: baseName,
    extension: extension,
    sourceFileName: sourceFileName,
    stageName: stage ? String(stage.Stage_Name || '') : '',
    teamName: team ? String(team.Team_Name || '') : '',
    assignmentTitle: assignment ? String(assignment.Title || '') : '',
    pathLabel: pathLabel,
    maxDirectMb: Math.round(MAX_BROWSER_UPLOAD_SIZE_BYTES / 1024 / 1024),
    maxStableMb: Math.round(MAX_STABLE_WEBAPP_UPLOAD_SIZE_BYTES / 1024 / 1024),
    title: mode === 'assignment-asset' ? '繳交項目穩定上傳' : '大檔穩定上傳',
    subtitle: mode === 'assignment-asset'
      ? '大於 18 MB 的作業附件會先直接送到雲端，再回主頁完成繳交。'
      : '大於 18 MB 的收件檔案會透過穩定上傳頁直接寫入 Google 雲端硬碟。',
    helperText: sourceFileName
      ? '請在下方重新選擇同一份檔案：' + sourceFileName
      : '請重新選擇要上傳的檔案。'
  };
}

function processLargeUploadForm(formObject) {
  return withLock_(function() {
    return processLargeUploadForm_(formObject);
  });
}

function processLargeUploadForm_(formObject) {
  var payload = formObject && typeof formObject === 'object' ? formObject : {};
  var mode = String(payload.uploadMode || payload.mode || '').trim();

  if (mode === 'file') {
    return handleLargeFileFormUpload_(payload);
  }

  if (mode === 'assignment-asset') {
    return handleLargeAssignmentAssetFormUpload_(payload);
  }

  throw new Error('未知的穩定上傳模式。');
}

function pickOptionalConfigValue_(options, key, fallback) {
  if (options && Object.prototype.hasOwnProperty.call(options, key)) {
    return String(options[key] || '').trim();
  }
  return String(fallback || '').trim();
}

function saveScriptConfig(spreadsheetId, driveRootFolderId, options) {
  if (!spreadsheetId || !driveRootFolderId) {
    throw new Error('Both spreadsheetId and driveRootFolderId are required.');
  }

  options = options && typeof options === 'object' ? options : {};
  var props = PropertiesService.getScriptProperties();
  var existingProps = props.getProperties();
  var nextProps = {
    SPREADSHEET_ID: String(spreadsheetId).trim(),
    DRIVE_ROOT_FOLDER_ID: String(driveRootFolderId).trim(),
    APP_TIME_ZONE: pickOptionalConfigValue_(options, 'timeZone', existingProps.APP_TIME_ZONE || APP_DEFAULTS.timeZone),
    FRONTEND_BASE_URL: pickOptionalConfigValue_(options, 'frontendBaseUrl', existingProps.FRONTEND_BASE_URL || APP_DEFAULTS.frontendBaseUrl),
    MAIL_SENDER_NAME: pickOptionalConfigValue_(options, 'mailSenderName', existingProps.MAIL_SENDER_NAME || APP_DEFAULTS.mailSenderName),
    MAIL_REPLY_TO: pickOptionalConfigValue_(options, 'mailReplyTo', existingProps.MAIL_REPLY_TO || APP_DEFAULTS.mailReplyTo),
    MAIL_FROM_ALIAS: pickOptionalConfigValue_(options, 'mailFromAlias', existingProps.MAIL_FROM_ALIAS || APP_DEFAULTS.mailFromAlias),
    PASSWORD_RESET_EXPIRY_MINUTES: pickOptionalConfigValue_(
      options,
      'passwordResetExpiryMinutes',
      existingProps.PASSWORD_RESET_EXPIRY_MINUTES || APP_DEFAULTS.passwordResetExpiryMinutes
    )
  };

  props.setProperties(nextProps, true);

  return buildHealthPayload_();
}

function configureImageDesignDefaults() {
  return saveScriptConfig('1OSkWSzpcgJqGaGIjC-CzeApZoeyBHMpfen29whTvGKY', '1UV356WstvdKJKzURrqYcbiJcsW4Wdx8Q', {
    frontendBaseUrl: 'https://visual-design-tw.github.io/Image-Design/',
    mailSenderName: '畢展形印組管理系統',
    passwordResetExpiryMinutes: 30,
    timeZone: 'Asia/Taipei'
  });
}

function primeImageDesignProperties() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    SPREADSHEET_ID: '1OSkWSzpcgJqGaGIjC-CzeApZoeyBHMpfen29whTvGKY',
    DRIVE_ROOT_FOLDER_ID: '1UV356WstvdKJKzURrqYcbiJcsW4Wdx8Q',
    APP_TIME_ZONE: 'Asia/Taipei',
    FRONTEND_BASE_URL: 'https://visual-design-tw.github.io/Image-Design/',
    MAIL_SENDER_NAME: '畢展形印組管理系統',
    MAIL_REPLY_TO: '',
    MAIL_FROM_ALIAS: '',
    PASSWORD_RESET_EXPIRY_MINUTES: '30'
  }, true);

  return {
    ok: true,
    spreadsheetId: '1OSkWSzpcgJqGaGIjC-CzeApZoeyBHMpfen29whTvGKY',
    driveRootFolderId: '1UV356WstvdKJKzURrqYcbiJcsW4Wdx8Q'
  };
}

function authorizeMailScope() {
  return {
    remainingDailyQuota: MailApp.getRemainingDailyQuota()
  };
}

function configureAssignmentReminderSettings(options) {
  return withLock_(function() {
    var state = loadState_();
    var nextSettings = normalizeAssignmentReminderSettings_(options);
    state.Meta[ASSIGNMENT_REMINDER_SETTINGS_META_KEY] = nextSettings;
    persistState_(state);
    return {
      ok: true,
      settings: nextSettings
    };
  });
}

function enableAssignmentReminderAutomation(options) {
  var result = configureAssignmentReminderSettings(Object.assign({
    enabled: true,
    offsetsHours: ASSIGNMENT_REMINDER_DEFAULT_OFFSETS_HOURS,
    sendEmail: true,
    sendSiteNotifications: true
  }, options || {}));
  var triggerInfo = installAssignmentReminderTrigger();
  return {
    ok: true,
    settings: result.settings,
    trigger: triggerInfo
  };
}

function disableAssignmentReminderAutomation() {
  var result = configureAssignmentReminderSettings({
    enabled: false
  });
  var triggerInfo = removeAssignmentReminderTriggers();
  return {
    ok: true,
    settings: result.settings,
    trigger: triggerInfo
  };
}

function installAssignmentReminderTrigger() {
  removeAssignmentReminderTriggers();
  var trigger = ScriptApp.newTrigger(ASSIGNMENT_REMINDER_TRIGGER_HANDLER)
    .timeBased()
    .everyHours(1)
    .create();

  return {
    ok: true,
    createdTriggerId: trigger.getUniqueId(),
    triggers: listAssignmentReminderTriggers()
  };
}

function removeAssignmentReminderTriggers() {
  var deleted = [];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (String(trigger.getHandlerFunction() || '') !== ASSIGNMENT_REMINDER_TRIGGER_HANDLER) {
      return;
    }
    deleted.push(trigger.getUniqueId());
    ScriptApp.deleteTrigger(trigger);
  });

  return {
    ok: true,
    deletedTriggerIds: deleted,
    triggers: listAssignmentReminderTriggers()
  };
}

function listAssignmentReminderTriggers() {
  return ScriptApp.getProjectTriggers().filter(function(trigger) {
    return String(trigger.getHandlerFunction() || '') === ASSIGNMENT_REMINDER_TRIGGER_HANDLER;
  }).map(function(trigger) {
    return {
      id: trigger.getUniqueId(),
      handler: trigger.getHandlerFunction(),
      eventType: String(trigger.getEventType()),
      source: String(trigger.getTriggerSource())
    };
  });
}

function runScheduledAssignmentReminders() {
  return withLock_(function() {
    var state = loadState_();
    var result = runScheduledAssignmentRemindersInternal_(state);
    if (result.changed) {
      persistState_(state);
    } else {
      setupSheets_();
      var config = getConfig_();
      var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
      writeMetaSheet_(spreadsheet, state.Meta || {});
    }
    return result;
  });
}

function setupSheets() {
  return setupSheets_();
}

function seedDemoData() {
  return withLock_(function() {
    persistState_(buildDemoState_());
    return loadState_();
  });
}

function parsePayload_(e) {
  var payload = {};
  var raw = e && e.postData && e.postData.contents ? e.postData.contents : '';

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      payload = {
        rawBody: raw
      };
    }
  }

  if (payload && typeof payload.payload === 'string') {
    try {
      payload.payload = JSON.parse(payload.payload);
    } catch (ignoreError) {
    }
  }

  if (payload.payload && typeof payload.payload === 'object') {
    payload = Object.assign({}, payload, payload.payload);
    delete payload.payload;
  }

  return payload;
}

function getAction_(e, payload) {
  return String(
    (payload && payload.action) ||
    (e && e.parameter && e.parameter.action) ||
    'bootstrap'
  ).trim();
}

function buildHealthPayload_() {
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  return {
    ok: true,
    spreadsheetId: config.spreadsheetId,
    spreadsheetName: spreadsheet.getName(),
    driveRootFolderId: config.driveRootFolderId,
    timeZone: config.timeZone,
    frontendBaseUrlConfigured: Boolean(config.frontendBaseUrl),
    mailSenderName: config.mailSenderName,
    mailReplyTo: config.mailReplyTo,
    mailFromAliasConfigured: Boolean(config.mailFromAlias),
    passwordResetExpiryMinutes: config.passwordResetExpiryMinutes,
    assignmentReminderTriggerCount: listAssignmentReminderTriggers().length,
    serverTime: nowString_()
  };
}

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('SPREADSHEET_ID') || APP_DEFAULTS.spreadsheetId;
  var driveRootFolderId = props.getProperty('DRIVE_ROOT_FOLDER_ID') || APP_DEFAULTS.driveRootFolderId;
  var timeZone = props.getProperty('APP_TIME_ZONE') || APP_DEFAULTS.timeZone;
  var frontendBaseUrl = String(props.getProperty('FRONTEND_BASE_URL') || APP_DEFAULTS.frontendBaseUrl || '').trim();
  var mailSenderName = String(props.getProperty('MAIL_SENDER_NAME') || APP_DEFAULTS.mailSenderName || '').trim();
  var mailReplyTo = String(props.getProperty('MAIL_REPLY_TO') || APP_DEFAULTS.mailReplyTo || '').trim();
  var mailFromAlias = String(props.getProperty('MAIL_FROM_ALIAS') || APP_DEFAULTS.mailFromAlias || '').trim();
  var passwordResetExpiryMinutes = Number(
    props.getProperty('PASSWORD_RESET_EXPIRY_MINUTES') || APP_DEFAULTS.passwordResetExpiryMinutes
  );

  if (!spreadsheetId || spreadsheetId === APP_DEFAULTS.spreadsheetId) {
    throw new Error('Missing SPREADSHEET_ID. Run saveScriptConfig(...) or set Script Properties first.');
  }

  if (!driveRootFolderId || driveRootFolderId === APP_DEFAULTS.driveRootFolderId) {
    throw new Error('Missing DRIVE_ROOT_FOLDER_ID. Run saveScriptConfig(...) or set Script Properties first.');
  }

  if (isNaN(passwordResetExpiryMinutes) || passwordResetExpiryMinutes <= 0) {
    passwordResetExpiryMinutes = APP_DEFAULTS.passwordResetExpiryMinutes;
  }

  return {
    spreadsheetId: spreadsheetId,
    driveRootFolderId: driveRootFolderId,
    timeZone: timeZone,
    frontendBaseUrl: frontendBaseUrl,
    mailSenderName: mailSenderName || APP_DEFAULTS.mailSenderName,
    mailReplyTo: mailReplyTo,
    mailFromAlias: mailFromAlias,
    passwordResetExpiryMinutes: passwordResetExpiryMinutes
  };
}

function setupSheets_() {
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var sheetNames = Object.keys(TABLE_SCHEMAS);

  sheetNames.forEach(function(sheetName) {
    ensureSheet_(spreadsheet, sheetName, TABLE_SCHEMAS[sheetName].headers);
  });

  return spreadsheet.getId();
}

function loadState_() {
  setupSheets_();

  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var state = {
    Config_Stages: readTable_(spreadsheet, 'Config_Stages'),
    Users: readTable_(spreadsheet, 'Users'),
    Teams: readTable_(spreadsheet, 'Teams'),
    Purchase_Items: readTable_(spreadsheet, 'Purchase_Items'),
    Assignments: readTable_(spreadsheet, 'Assignments'),
    Assignment_Submissions: readTable_(spreadsheet, 'Assignment_Submissions'),
    Files: readTable_(spreadsheet, 'Files'),
    Notifications: readTable_(spreadsheet, 'Notifications'),
    Discussion_Comments: readTable_(spreadsheet, 'Discussion_Comments'),
    Meta: readMetaSheet_(spreadsheet)
  };

  var rawNotificationFingerprints = ensureArray_(state.Notifications).map(function(notification) {
    return buildNotificationNormalizationFingerprint_(notification);
  });
  state = normalizeState_(state);
  var didNormalizeNotifications = rawNotificationFingerprints.length !== ensureArray_(state.Notifications).length
    || ensureArray_(state.Notifications).some(function(notification, index) {
      return rawNotificationFingerprints[index] !== buildNotificationNormalizationFingerprint_(notification);
    });
  var didBackfillPurchaseDates = backfillPurchaseItemDates_(state);
  if (didNormalizeNotifications || didBackfillPurchaseDates) {
    writeStateTables_(spreadsheet, state);
  }

  return state;
}

function getStateRevision_(state) {
  var value = Number(state && state.Meta ? state.Meta.State_Revision : 0);
  return isNaN(value) || value < 0 ? 0 : Math.floor(value);
}

function persistState_(inputState, options) {
  options = options || {};
  setupSheets_();

  var state = normalizeState_(cloneObject_(inputState));
  var existingState = options.existingState || loadState_();
  state = mergeSensitiveState_(state, existingState);
  state.Meta = state.Meta && typeof state.Meta === 'object' ? state.Meta : {};
  state.Meta.State_Revision = typeof options.nextRevision === 'number'
    ? options.nextRevision
    : getStateRevision_(existingState) + 1;
  sendPendingAssignmentAnnouncementEmails_(state);
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);

  writeStateTables_(spreadsheet, state);
}

function loadActivityLogs_() {
  setupSheets_();
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  return readTable_(spreadsheet, 'Activity_Logs').sort(function(a, b) {
    return String(b.Created_At || '').localeCompare(String(a.Created_At || ''));
  });
}

function appendActivityLogEntries_(entries) {
  var pendingEntries = ensureArray_(entries).filter(function(entry) {
    return entry && entry.Action && entry.Summary;
  });
  if (pendingEntries.length === 0) return;

  setupSheets_();
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var records = readTable_(spreadsheet, 'Activity_Logs');

  pendingEntries.forEach(function(entry) {
    var nextEntry = cloneObject_(entry);
    nextEntry.Log_ID = String(nextEntry.Log_ID || generateSequentialId_('AL', records, 'Log_ID'));
    nextEntry.Created_At = String(nextEntry.Created_At || nowString_());
    nextEntry.Actor_User_ID = String(nextEntry.Actor_User_ID || '');
    nextEntry.Actor_Name = String(nextEntry.Actor_Name || '系統');
    nextEntry.Actor_Role = String(nextEntry.Actor_Role || 'System');
    nextEntry.Action = String(nextEntry.Action || '系統異動');
    nextEntry.Summary = String(nextEntry.Summary || '系統資料已更新。');
    nextEntry.Target_Type = String(nextEntry.Target_Type || 'system');
    nextEntry.Target_ID = String(nextEntry.Target_ID || '');
    nextEntry.Severity = String(nextEntry.Severity || 'normal');
    nextEntry.Metadata = nextEntry.Metadata && typeof nextEntry.Metadata === 'object'
      ? nextEntry.Metadata
      : {};
    records.unshift(nextEntry);
  });

  records.sort(function(a, b) {
    return String(b.Created_At || '').localeCompare(String(a.Created_At || ''));
  });
  writeTable_(spreadsheet, 'Activity_Logs', records.slice(0, ACTIVITY_LOG_MAX_RECORDS));
}

function createActivityLogEntry_(actor, action, summary, targetType, targetId, severity, metadata) {
  return {
    Created_At: nowString_(),
    Actor_User_ID: actor ? String(actor.User_ID || '') : '',
    Actor_Name: actor ? String(actor.Name || '未具名使用者') : '系統',
    Actor_Role: actor ? String(actor.Role || '') : 'System',
    Action: String(action || '系統異動'),
    Summary: String(summary || '系統資料已更新。'),
    Target_Type: String(targetType || 'system'),
    Target_ID: String(targetId || ''),
    Severity: String(severity || 'normal'),
    Metadata: metadata && typeof metadata === 'object' ? metadata : {}
  };
}

function resolveAuditActor_(state, userId) {
  var targetId = String(userId || '').trim();
  if (!targetId) return null;
  return ensureArray_(state && state.Users).find(function(user) {
    return String(user.User_ID || '') === targetId;
  }) || null;
}

function isShapePrintUser_(user) {
  return Boolean(user) && ['SuperAdmin', 'Admin'].indexOf(String(user.Role || '')) >= 0;
}

function buildAuditComparableRecord_(record, excludedFields) {
  var copy = cloneObject_(record || {});
  ensureArray_(excludedFields).forEach(function(field) {
    delete copy[field];
  });
  return copy;
}

function buildAuditCollectionDelta_(beforeItems, afterItems, idField, excludedFields) {
  var beforeById = {};
  var afterById = {};
  ensureArray_(beforeItems).forEach(function(item) {
    var id = String(item && item[idField] || '');
    if (id) beforeById[id] = item;
  });
  ensureArray_(afterItems).forEach(function(item) {
    var id = String(item && item[idField] || '');
    if (id) afterById[id] = item;
  });

  var created = Object.keys(afterById).filter(function(id) {
    return !beforeById[id];
  });
  var deleted = Object.keys(beforeById).filter(function(id) {
    return !afterById[id];
  });
  var updated = Object.keys(afterById).filter(function(id) {
    return beforeById[id]
      && JSON.stringify(buildAuditComparableRecord_(beforeById[id], excludedFields))
        !== JSON.stringify(buildAuditComparableRecord_(afterById[id], excludedFields));
  });

  return {
    created: created,
    deleted: deleted,
    updated: updated,
    afterById: afterById,
    beforeById: beforeById
  };
}

function describeAuditTargets_(ids, recordsById, labelField) {
  return ensureArray_(ids).slice(0, 2).map(function(id) {
    var record = recordsById[id] || {};
    return String(record[labelField] || id);
  }).join('、');
}

function buildStateAuditEntries_(beforeState, afterState, actor) {
  if (!actor) return [];

  var collections = [
    { key: 'Config_Stages', idField: 'Stage_ID', label: '會審期數', labelField: 'Stage_Name', targetType: 'stage' },
    { key: 'Purchase_Items', idField: 'Item_ID', label: '印刷品項', labelField: 'Item_Name', targetType: 'purchase' },
    { key: 'Assignments', idField: 'Assignment_ID', label: '繳交項目', labelField: 'Title', targetType: 'assignment' },
    { key: 'Assignment_Submissions', idField: 'Submission_ID', label: '繳交紀錄', labelField: 'File_Name', targetType: 'submission' },
    { key: 'Files', idField: 'File_ID', label: '檔案紀錄', labelField: 'File_Name', targetType: 'file' },
    { key: 'Users', idField: 'User_ID', label: '帳號與角色', labelField: 'Name', targetType: 'user', excludedFields: ['Password'] },
    { key: 'Teams', idField: 'Team_ID', label: '小組資料', labelField: 'Team_Name', targetType: 'team' }
  ];

  var entries = [];
  collections.forEach(function(config) {
    var delta = buildAuditCollectionDelta_(
      beforeState && beforeState[config.key],
      afterState && afterState[config.key],
      config.idField,
      config.excludedFields
    );
    var total = delta.created.length + delta.deleted.length + delta.updated.length;
    if (total === 0) return;

    var action = '更新' + config.label;
    var sourceIds = delta.updated;
    var sourceRecords = delta.afterById;
    if (delta.created.length > 0 && delta.deleted.length === 0 && delta.updated.length === 0) {
      action = '新增' + config.label;
      sourceIds = delta.created;
    } else if (delta.deleted.length > 0 && delta.created.length === 0 && delta.updated.length === 0) {
      action = '刪除' + config.label;
      sourceIds = delta.deleted;
      sourceRecords = delta.beforeById;
    }

    var parts = [];
    if (delta.created.length) parts.push('新增 ' + delta.created.length + ' 筆');
    if (delta.updated.length) parts.push('更新 ' + delta.updated.length + ' 筆');
    if (delta.deleted.length) parts.push('刪除 ' + delta.deleted.length + ' 筆');
    var targetText = describeAuditTargets_(sourceIds, sourceRecords, config.labelField);
    var summary = config.label + '已異動：' + parts.join('、') + (targetText ? '（' + targetText + '）' : '');

    entries.push(createActivityLogEntry_(
      actor,
      action,
      summary,
      config.targetType,
      sourceIds[0] || '',
      delta.deleted.length > 0 ? 'warning' : 'normal',
      {
        source: 'saveState',
        createdIds: delta.created,
        updatedIds: delta.updated,
        deletedIds: delta.deleted
      }
    ));
  });

  return entries;
}

function handleBootstrap_(payload) {
  var state = loadState_();
  var sessionContext = requireSessionContext_(state, payload);
  return buildClientStateResultForUser_(state, sessionContext.user, {
    sessionExpiresAt: sessionContext.session.Expires_At
  });
}

function assertExpectedStateRevision_(payload, state) {
  var expected = Number(payload && payload.stateRevision);
  var current = getStateRevision_(state);
  if (isNaN(expected) || expected !== current) {
    throw new Error('STATE_CONFLICT: 雲端資料已被其他使用者更新，系統已停止本次覆蓋，請重新載入後再操作。');
  }
}

function buildComparableCollection_(items, idField, excludedFields) {
  return ensureArray_(items).map(function(item) {
    return buildAuditComparableRecord_(item, excludedFields);
  }).sort(function(a, b) {
    return String(a[idField] || '').localeCompare(String(b[idField] || ''));
  });
}

function assertCollectionUnchanged_(existing, incoming, key, idField, excludedFields) {
  var before = JSON.stringify(buildComparableCollection_(existing[key], idField, excludedFields));
  var after = JSON.stringify(buildComparableCollection_(incoming[key], idField, excludedFields));
  if (before !== after) {
    throw new Error('FORBIDDEN: 你沒有修改「' + key + '」的權限。');
  }
}

function cloneServerMeta_(state) {
  return cloneObject_(state && state.Meta && typeof state.Meta === 'object' ? state.Meta : {});
}

function mergeOwnNotificationReadState_(nextState, incomingState, user) {
  var incomingById = {};
  ensureArray_(incomingState.Notifications).forEach(function(notification) {
    if (String(notification.User_ID || '') === String(user.User_ID || '')) {
      incomingById[String(notification.Notification_ID || '')] = notification;
    }
  });
  nextState.Notifications.forEach(function(notification) {
    var incoming = incomingById[String(notification.Notification_ID || '')];
    if (incoming && String(notification.User_ID || '') === String(user.User_ID || '') && incoming.Read === true) {
      notification.Read = true;
    }
  });
}

function getStudentDiscussionContext_(state, comment, teamId) {
  var refType = String(comment && comment.Ref_Type || '');
  var refId = String(comment && comment.Ref_ID || '');
  if (refType === 'assignment') {
    var assignment = ensureArray_(state.Assignments).find(function(item) {
      return String(item.Assignment_ID || '') === refId;
    });
    return assignment && isAssignmentVisibleToTeam_(state, assignment, teamId) ? assignment : null;
  }
  if (refType === 'file-group') {
    var file = ensureArray_(state.Files).find(function(item) {
      return String(item.File_Group_Key || '') === refId && String(item.Team_ID || '') === teamId;
    });
    return file || null;
  }
  return null;
}

function mergeStudentDiscussionComments_(nextState, incomingState, actor) {
  var existingIds = {};
  ensureArray_(nextState.Discussion_Comments).forEach(function(comment) {
    existingIds[String(comment.Comment_ID || '')] = true;
  });

  ensureArray_(incomingState.Discussion_Comments).forEach(function(comment) {
    var requestedId = String(comment && comment.Comment_ID || '');
    if (requestedId && existingIds[requestedId]) return;
    if (String(comment && comment.Kind || 'comment') === 'system') return;
    var message = String(comment && comment.Message || '').trim();
    var context = getStudentDiscussionContext_(nextState, comment, actor.Team_ID);
    if (!message || !context) return;

    var canonical = hydrateDiscussionCommentRecord_({
      Comment_ID: generateSequentialId_('CMT', nextState.Discussion_Comments, 'Comment_ID'),
      Ref_Type: comment.Ref_Type,
      Ref_ID: comment.Ref_ID,
      User_ID: actor.User_ID,
      Team_ID: actor.Team_ID,
      Author_Name: actor.Name,
      Author_Role: actor.Role,
      Kind: 'comment',
      Message: message.slice(0, 5000),
      Created_At: nowString_()
    });
    nextState.Discussion_Comments.push(canonical);
    createNotifications_(nextState, {
      type: 'discussion-comment',
      title: '小組留言回覆',
      message: '「' + (context.Title || context.File_Name || '繳交項目') + '」有新的小組留言。',
      tab: 'files',
      refType: canonical.Ref_Type,
      refId: canonical.Ref_ID,
      audience: { roles: ['SuperAdmin', 'Admin'], excludeUserIds: [actor.User_ID] },
      createdAt: canonical.Created_At,
      priority: 'normal'
    });
  });
}

function mergeStudentSubmissions_(nextState, incomingState, actor) {
  var existingIds = {};
  ensureArray_(nextState.Assignment_Submissions).forEach(function(submission) {
    existingIds[String(submission.Submission_ID || '')] = true;
  });

  ensureArray_(incomingState.Assignment_Submissions).forEach(function(candidate) {
    var requestedId = String(candidate && candidate.Submission_ID || '');
    if (requestedId && existingIds[requestedId]) return;
    if (String(candidate && candidate.Team_ID || '') !== String(actor.Team_ID || '')) return;
    var assignment = ensureArray_(nextState.Assignments).find(function(item) {
      return String(item.Assignment_ID || '') === String(candidate.Assignment_ID || '');
    });
    if (!assignment || !isAssignmentVisibleToTeam_(nextState, assignment, actor.Team_ID)) return;

    var existingForAssignment = ensureArray_(nextState.Assignment_Submissions).filter(function(item) {
      return String(item.Assignment_ID || '') === String(assignment.Assignment_ID || '')
        && String(item.Team_ID || '') === String(actor.Team_ID || '');
    });
    if (existingForAssignment.length > 0 && assignment.Allow_ReSubmit !== true) {
      throw new Error('FORBIDDEN: 此繳交項目目前不開放重新繳交。');
    }

    var requiresFile = assignment.Submission_Mode === 'file' || assignment.Submission_Mode === 'file-text';
    var requiresText = assignment.Submission_Mode === 'text' || assignment.Submission_Mode === 'file-text';
    var fileName = String(candidate.File_Name || '').trim();
    var textContent = String(candidate.Text_Content || '').trim();
    if ((requiresFile && !fileName) || (requiresText && !textContent)) {
      throw new Error('請完成繳交項目要求的檔案或文字內容。');
    }

    var submissionNo = existingForAssignment.reduce(function(max, item) {
      return Math.max(max, Number(item.Submission_No || 0));
    }, 0) + 1;
    var createdAt = nowString_();
    var submission = hydrateAssignmentSubmissionRecord_({
      Submission_ID: generateSequentialId_('SUB', nextState.Assignment_Submissions, 'Submission_ID'),
      Assignment_ID: assignment.Assignment_ID,
      User_ID: actor.User_ID,
      Team_ID: actor.Team_ID,
      Submission_No: submissionNo,
      Submission_Mode: assignment.Submission_Mode,
      File_Name: requiresFile ? fileName : '',
      Google_Drive_URL: requiresFile ? String(candidate.Google_Drive_URL || '') : '',
      Text_Content: requiresText ? textContent.slice(0, 10000) : '',
      Submitted_At: createdAt,
      Updated_At: createdAt,
      Status: '已繳交',
      Notes: '',
      Drive_File_ID: requiresFile ? String(candidate.Drive_File_ID || '') : '',
      Drive_Folder_ID: requiresFile ? String(candidate.Drive_Folder_ID || '') : ''
    });
    nextState.Assignment_Submissions.unshift(submission);
    createNotifications_(nextState, {
      type: 'assignment-submit',
      title: '小組已繳交作業',
      message: '「' + assignment.Title + '」已有新的繳交紀錄。',
      tab: 'files',
      refType: 'assignment',
      refId: assignment.Assignment_ID,
      audience: { roles: ['SuperAdmin', 'Admin'] },
      createdAt: createdAt,
      priority: 'normal'
    });
    nextState.Discussion_Comments.push(hydrateDiscussionCommentRecord_({
      Comment_ID: generateSequentialId_('CMT', nextState.Discussion_Comments, 'Comment_ID'),
      Ref_Type: 'assignment',
      Ref_ID: assignment.Assignment_ID,
      User_ID: '',
      Team_ID: actor.Team_ID,
      Author_Name: '形印系統',
      Author_Role: 'System',
      Kind: 'system',
      Message: actor.Name + ' 已完成第 ' + submissionNo + ' 次繳交。',
      Created_At: createdAt
    }));
  });
}

function mergeLeaderInvites_(nextState, incomingState, actor) {
  if (String(actor.Role || '') !== 'Leader') return;
  var emails = {};
  nextState.Users.forEach(function(user) {
    emails[normalizeEmail_(user.Email)] = true;
  });
  ensureArray_(incomingState.Users).forEach(function(candidate) {
    var requestedId = String(candidate && candidate.User_ID || '');
    var alreadyExists = nextState.Users.some(function(user) {
      return String(user.User_ID || '') === requestedId;
    });
    if (alreadyExists) return;
    var email = normalizeEmail_(candidate && candidate.Email);
    if (!email || emails[email]) return;
    if (String(candidate && candidate.Team_ID || '') !== String(actor.Team_ID || '')) return;
    var user = {
      User_ID: generateSequentialId_('U', nextState.Users, 'User_ID'),
      Email: email,
      Password: '',
      Name: String(candidate && candidate.Name || '待開通成員').slice(0, 120),
      Team_ID: actor.Team_ID,
      Role: 'Member',
      Status: 'Pending'
    };
    nextState.Users.push(user);
    emails[email] = true;
  });
}

function mergeClientStateForActor_(existingState, incomingState, actor) {
  var existing = normalizeState_(cloneObject_(existingState));
  var incoming = normalizeState_(cloneObject_(incomingState));
  var nextState;

  if (String(actor.Role || '') === 'SuperAdmin') {
    nextState = incoming;
    nextState.Meta = cloneServerMeta_(existing);
    return nextState;
  }

  if (String(actor.Role || '') === 'Admin') {
    ['Config_Stages', 'Users', 'Teams', 'Files', 'Assignment_Submissions'].forEach(function(key) {
      var idField = key === 'Config_Stages' ? 'Stage_ID'
        : key === 'Users' ? 'User_ID'
        : key === 'Teams' ? 'Team_ID'
        : key === 'Files' ? 'File_ID'
        : 'Submission_ID';
      assertCollectionUnchanged_(existing, incoming, key, idField, key === 'Users' ? ['Password'] : []);
    });
    nextState = existing;
    nextState.Purchase_Items = incoming.Purchase_Items;
    nextState.Assignments = incoming.Assignments;
    nextState.Discussion_Comments = incoming.Discussion_Comments;
    mergeOwnNotificationReadState_(nextState, incoming, actor);
    nextState.Meta = cloneServerMeta_(existing);
    return nextState;
  }

  nextState = existing;
  mergeStudentSubmissions_(nextState, incoming, actor);
  mergeStudentDiscussionComments_(nextState, incoming, actor);
  mergeLeaderInvites_(nextState, incoming, actor);
  mergeOwnNotificationReadState_(nextState, incoming, actor);
  nextState.Meta = cloneServerMeta_(existing);
  return nextState;
}

function handleSaveState_(payload) {
  if (!payload.state || typeof payload.state !== 'object') {
    throw new Error('Missing `state` payload for saveState.');
  }
  var previousState = loadState_();
  var actor = requireSessionUser_(previousState, payload);
  assertExpectedStateRevision_(payload, previousState);
  var mergedState = mergeClientStateForActor_(previousState, payload.state, actor);
  persistState_(mergedState, {
    existingState: previousState,
    nextRevision: getStateRevision_(previousState) + 1
  });
  var nextState = loadState_();
  appendActivityLogEntries_(buildStateAuditEntries_(previousState, nextState, actor));
  return buildClientStateResultForUser_(nextState, actor);
}

// Delete one purchase record from the latest server state so a stale browser
// snapshot can never restore it after the action has completed.
function handleDeletePurchaseItem_(payload) {
  var previousState = loadState_();
  var actor = requireSessionUser_(previousState, payload, ['SuperAdmin', 'Admin']);
  var itemId = String(payload && payload.itemId || '').trim();

  if (!itemId) {
    throw new Error('deletePurchaseItem requires `itemId`.');
  }

  var targetItem = ensureArray_(previousState.Purchase_Items).find(function(item) {
    return String(item && item.Item_ID || '') === itemId;
  });

  if (!targetItem) {
    throw new Error('NOT_FOUND: 找不到要刪除的發包品項，資料可能已被其他使用者更新。');
  }

  var nextState = cloneObject_(previousState);
  nextState.Purchase_Items = ensureArray_(nextState.Purchase_Items).filter(function(item) {
    return String(item && item.Item_ID || '') !== itemId;
  });

  persistState_(nextState, {
    existingState: previousState,
    nextRevision: getStateRevision_(previousState) + 1
  });

  var savedState = loadState_();
  appendActivityLogEntries_(buildStateAuditEntries_(previousState, savedState, actor));

  return buildClientStateResultForUser_(savedState, actor, {
    deletedItem: targetItem
  });
}

function handleGetActivityLogs_(payload) {
  var state = loadState_();
  var viewer = requireSessionUser_(state, payload, ['SuperAdmin', 'Admin']);
  if (!isShapePrintUser_(viewer)) {
    throw new Error('FORBIDDEN: 操作紀錄僅限形印組查看。');
  }
  var requestedLimit = Number(payload && payload.limit || 100);
  var limit = Math.max(1, Math.min(200, isNaN(requestedLimit) ? 100 : requestedLimit));
  return { logs: loadActivityLogs_().slice(0, limit) };
}

function loadPasswordResetTokens_() {
  setupSheets_();

  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  return readTable_(spreadsheet, 'Password_Reset_Tokens').map(function(record) {
    return normalizePasswordResetTokenRecord_(record);
  });
}

function persistPasswordResetTokens_(records) {
  setupSheets_();

  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var normalizedRecords = ensureArray_(records).map(function(record) {
    return normalizePasswordResetTokenRecord_(record);
  }).sort(function(a, b) {
    return Number(b.Requested_At_Millis || 0) - Number(a.Requested_At_Millis || 0);
  });

  writeTable_(spreadsheet, 'Password_Reset_Tokens', normalizedRecords);
}

function writeStateTables_(spreadsheet, state) {
  writeTable_(spreadsheet, 'Config_Stages', state.Config_Stages);
  writeTable_(spreadsheet, 'Users', state.Users);
  writeTable_(spreadsheet, 'Teams', state.Teams);
  writeTable_(spreadsheet, 'Purchase_Items', state.Purchase_Items);
  writeTable_(spreadsheet, 'Assignments', state.Assignments);
  writeTable_(spreadsheet, 'Assignment_Submissions', state.Assignment_Submissions);
  writeTable_(spreadsheet, 'Files', state.Files);
  writeTable_(spreadsheet, 'Notifications', state.Notifications);
  writeTable_(spreadsheet, 'Discussion_Comments', state.Discussion_Comments);
  writeMetaSheet_(spreadsheet, state.Meta || {});
}

function buildClientStateResult_(state, extraData) {
  var result = cloneObject_(extraData || {});
  var safeState = sanitizeStateForClient_(state);
  result.state = safeState;
  result.heatmap = buildHeatmapStats_(safeState);
  return result;
}

function sanitizeStateForClient_(state) {
  var safeState = cloneObject_(state);
  safeState = normalizeState_(safeState);
  safeState.Users = safeState.Users.map(function(user) {
    return sanitizeUserRecord_(user);
  });
  return safeState;
}

function sanitizeUserRecord_(user) {
  var safeUser = cloneObject_(user);
  safeUser.Password = '';
  return safeUser;
}

function loadAuthSessions_() {
  setupSheets_();
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  return readTable_(spreadsheet, 'Auth_Sessions').map(function(record) {
    return normalizeAuthSessionRecord_(record);
  });
}

function persistAuthSessions_(records) {
  setupSheets_();
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var normalized = ensureArray_(records).map(function(record) {
    return normalizeAuthSessionRecord_(record);
  }).filter(function(record) {
    return record.Session_ID && record.Token_Hash;
  });
  writeTable_(spreadsheet, 'Auth_Sessions', normalized);
}

function normalizeAuthSessionRecord_(record) {
  if (!record || typeof record !== 'object') {
    record = {};
  }
  record.Session_ID = String(record.Session_ID || '');
  record.User_ID = String(record.User_ID || '');
  record.Token_Hash = String(record.Token_Hash || '');
  record.Created_At = String(record.Created_At || '');
  record.Expires_At = String(record.Expires_At || '');
  record.Last_Seen_At = String(record.Last_Seen_At || '');
  record.Revoked_At = String(record.Revoked_At || '');
  record.Expires_At_Millis = Number(record.Expires_At_Millis || 0);
  return record;
}

function hashSessionToken_(token) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token || ''),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(digest);
}

function cleanupAuthSessions_(records) {
  var cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  return ensureArray_(records).filter(function(record) {
    var expiresAt = Number(record.Expires_At_Millis || 0);
    return expiresAt === 0 || expiresAt >= cutoff;
  });
}

function issueSession_(user) {
  var sessions = cleanupAuthSessions_(loadAuthSessions_());
  var now = new Date();
  var expiresAt = new Date(now.getTime() + (AUTH_SESSION_TTL_HOURS * 60 * 60 * 1000));
  var rawToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var activeSessions = sessions.filter(function(session) {
    return session.User_ID === String(user.User_ID || '')
      && !session.Revoked_At
      && Number(session.Expires_At_Millis || 0) > now.getTime();
  }).sort(function(a, b) {
    return Number(a.Expires_At_Millis || 0) - Number(b.Expires_At_Millis || 0);
  });

  while (activeSessions.length >= AUTH_SESSION_MAX_PER_USER) {
    var oldest = activeSessions.shift();
    oldest.Revoked_At = formatDateTime_(now);
  }

  sessions.unshift(normalizeAuthSessionRecord_({
    Session_ID: generateSequentialId_('SES', sessions, 'Session_ID'),
    User_ID: String(user.User_ID || ''),
    Token_Hash: hashSessionToken_(rawToken),
    Created_At: formatDateTime_(now),
    Expires_At: formatDateTime_(expiresAt),
    Last_Seen_At: formatDateTime_(now),
    Revoked_At: '',
    Expires_At_Millis: expiresAt.getTime()
  }));
  persistAuthSessions_(sessions);

  return {
    token: rawToken,
    expiresAt: formatDateTime_(expiresAt)
  };
}

function requireSessionContext_(state, payload, allowedRoles) {
  var rawToken = String(payload && payload.sessionToken || '').trim();
  if (!rawToken) {
    throw new Error('AUTH_REQUIRED: 請重新登入後再繼續。');
  }

  var tokenHash = hashSessionToken_(rawToken);
  var now = Date.now();
  var sessions = cleanupAuthSessions_(loadAuthSessions_());
  var session = sessions.find(function(item) {
    return item.Token_Hash === tokenHash
      && !item.Revoked_At
      && Number(item.Expires_At_Millis || 0) > now;
  }) || null;
  if (!session) {
    throw new Error('AUTH_EXPIRED: 登入狀態已過期，請重新登入。');
  }

  var user = ensureArray_(state && state.Users).find(function(item) {
    return String(item.User_ID || '') === session.User_ID;
  }) || null;
  if (!user || String(user.Status || '') !== 'Active') {
    throw new Error('AUTH_EXPIRED: 帳號目前無法使用，請重新登入。');
  }
  if (ensureArray_(allowedRoles).length > 0 && ensureArray_(allowedRoles).indexOf(String(user.Role || '')) === -1) {
    throw new Error('FORBIDDEN: 你沒有執行這項操作的權限。');
  }

  return { user: user, session: session };
}

function requireSessionUser_(state, payload, allowedRoles) {
  return requireSessionContext_(state, payload, allowedRoles).user;
}

function handleLogoutSession_(payload) {
  var rawToken = String(payload && payload.sessionToken || '').trim();
  if (!rawToken) return { revoked: false };
  var tokenHash = hashSessionToken_(rawToken);
  var sessions = loadAuthSessions_();
  var changed = false;
  sessions.forEach(function(session) {
    if (session.Token_Hash === tokenHash && !session.Revoked_At) {
      session.Revoked_At = nowString_();
      changed = true;
    }
  });
  if (changed) persistAuthSessions_(sessions);
  return { revoked: changed };
}

function revokeAllSessionsForUser_(userId) {
  var targetUserId = String(userId || '').trim();
  if (!targetUserId) return;
  var sessions = loadAuthSessions_();
  var changed = false;
  sessions.forEach(function(session) {
    if (session.User_ID === targetUserId && !session.Revoked_At) {
      session.Revoked_At = nowString_();
      changed = true;
    }
  });
  if (changed) persistAuthSessions_(sessions);
}

function requireStudentUploadActor_(state, payload) {
  var actor = requireSessionUser_(state, payload, ['Leader', 'Member']);
  if (!actor.Team_ID || actor.Team_ID === 'T00') {
    throw new Error('FORBIDDEN: 只有已加入正式小組的帳號可以上傳檔案。');
  }
  var requestedTeamId = String(payload && payload.teamId || '').trim();
  if (requestedTeamId && requestedTeamId !== String(actor.Team_ID || '')) {
    throw new Error('FORBIDDEN: 不可替其他小組上傳檔案。');
  }
  return actor;
}

function isAssignmentVisibleToTeam_(state, assignment, teamId) {
  return getAssignmentTargetTeamIds_(state, assignment).indexOf(String(teamId || '')) >= 0;
}

function filterStateForUser_(state, user) {
  var safeState = sanitizeStateForClient_(state);
  if (isShapePrintUser_(user)) {
    safeState.Meta = { State_Revision: getStateRevision_(state) };
    return safeState;
  }

  var teamId = String(user.Team_ID || '');
  var visibleAssignments = safeState.Assignments.filter(function(assignment) {
    return isAssignmentVisibleToTeam_(state, assignment, teamId);
  });
  var visibleAssignmentIds = {};
  visibleAssignments.forEach(function(assignment) {
    visibleAssignmentIds[String(assignment.Assignment_ID || '')] = true;
    if (String(assignment.Target_Mode || '') === 'selected') {
      assignment.Target_Team_IDs = [teamId];
    }
  });

  safeState.Users = safeState.Users.filter(function(item) {
    return String(item.Team_ID || '') === teamId;
  });
  safeState.Teams = safeState.Teams.filter(function(item) {
    return String(item.Team_ID || '') === teamId;
  });
  safeState.Config_Stages = safeState.Config_Stages.map(function(stage) {
    stage.Budget_Allocated = 0;
    return stage;
  });
  safeState.Purchase_Items = safeState.Purchase_Items.map(function(item) {
    item.Vendor_Price = 0;
    item.Subtotal = 0;
    return item;
  });
  safeState.Assignments = visibleAssignments;
  safeState.Assignment_Submissions = safeState.Assignment_Submissions.filter(function(item) {
    return String(item.Team_ID || '') === teamId;
  });
  safeState.Files = safeState.Files.filter(function(item) {
    return String(item.Team_ID || '') === teamId;
  });
  safeState.Notifications = safeState.Notifications.filter(function(item) {
    return String(item.User_ID || '') === String(user.User_ID || '');
  });
  safeState.Discussion_Comments = safeState.Discussion_Comments.filter(function(comment) {
    return String(comment.Team_ID || '') === teamId
      || (String(comment.Ref_Type || '') === 'assignment' && visibleAssignmentIds[String(comment.Ref_ID || '')]);
  });
  safeState.Meta = { State_Revision: getStateRevision_(state) };
  return safeState;
}

function buildClientStateResultForUser_(state, user, extraData) {
  var result = cloneObject_(extraData || {});
  var safeState = filterStateForUser_(state, user);
  result.state = safeState;
  result.currentUser = sanitizeUserRecord_(user);
  result.stateRevision = getStateRevision_(state);
  result.heatmap = buildHeatmapStats_(safeState);
  return result;
}

function mergeSensitiveState_(nextState, existingState) {
  var usersById = {};
  var usersByEmail = {};
  var assignmentsById = {};

  ensureArray_(existingState && existingState.Users).forEach(function(user) {
    var normalizedEmail = normalizeEmail_(user.Email);
    if (user.User_ID) {
      usersById[String(user.User_ID)] = cloneObject_(user);
    }
    if (normalizedEmail) {
      usersByEmail[normalizedEmail] = cloneObject_(user);
    }
  });

  ensureArray_(existingState && existingState.Assignments).forEach(function(assignment) {
    if (!assignment || !assignment.Assignment_ID) return;
    assignmentsById[String(assignment.Assignment_ID)] = cloneObject_(assignment);
  });

  nextState.Users = ensureArray_(nextState.Users).map(function(user) {
    var nextUser = cloneObject_(user);
    var existingUser = usersById[String(nextUser.User_ID || '')] || usersByEmail[normalizeEmail_(nextUser.Email)] || null;
    var rawPassword = String(nextUser.Password || '');

    if (rawPassword) {
      nextUser.Password = isPasswordHash_(rawPassword) ? rawPassword : hashPassword_(rawPassword);
    } else if (existingUser && existingUser.Password) {
      nextUser.Password = String(existingUser.Password);
    } else {
      nextUser.Password = '';
    }

    return nextUser;
  });

  nextState.Assignments = ensureArray_(nextState.Assignments).map(function(assignment) {
    var nextAssignment = cloneObject_(assignment);
    var existingAssignment = assignmentsById[String(nextAssignment.Assignment_ID || '')] || null;

    nextAssignment.Notify_By_Email = nextAssignment.Notify_By_Email === true;
    nextAssignment.Email_Notification_Sent = nextAssignment.Email_Notification_Sent === true
      || Boolean(existingAssignment && existingAssignment.Email_Notification_Sent === true);

    return nextAssignment;
  });

  return nextState;
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  var currentLastColumn = Math.max(sheet.getLastColumn(), headers.length);
  var currentHeaders = currentLastColumn > 0
    ? sheet.getRange(1, 1, 1, currentLastColumn).getValues()[0]
    : [];
  var shouldRewriteHeader = headers.some(function(header, index) {
    return String(currentHeaders[index] || '') !== header;
  });

  if (shouldRewriteHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function readTable_(spreadsheet, sheetName) {
  var schema = TABLE_SCHEMAS[sheetName];
  var sheet = ensureSheet_(spreadsheet, sheetName, schema.headers);
  var lastRow = sheet.getLastRow();
  var lastColumn = Math.max(sheet.getLastColumn(), schema.headers.length);

  if (lastRow <= 1) {
    return [];
  }

  var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  var headerRow = values[0].map(function(value) {
    return String(value || '').trim();
  });
  var rows = values.slice(1);

  return rows.filter(function(row) {
    return row.some(function(cell) {
      return String(cell || '').trim() !== '';
    });
  }).map(function(row) {
    var record = {};
    schema.headers.forEach(function(header) {
      var index = headerRow.indexOf(header);
      var rawValue = index >= 0 ? row[index] : '';
      record[header] = coerceValue_(rawValue, schema.types[header] || 'string');
    });
    return record;
  });
}

function writeTable_(spreadsheet, sheetName, records) {
  var schema = TABLE_SCHEMAS[sheetName];
  var sheet = ensureSheet_(spreadsheet, sheetName, schema.headers);
  var rows = ensureArray_(records).map(function(record) {
    return schema.headers.map(function(header) {
      return serializeValue_(record[header], schema.types[header] || 'string');
    });
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, schema.headers.length).setValues(rows);
  }
}

function readMetaSheet_(spreadsheet) {
  var rows = readTable_(spreadsheet, 'Meta');
  var meta = {};

  rows.forEach(function(row) {
    if (!row.Key) return;
    meta[row.Key] = row.Value;
  });

  return meta;
}

function writeMetaSheet_(spreadsheet, metaObject) {
  var rows = Object.keys(metaObject || {}).sort().map(function(key) {
    return {
      Key: key,
      Value: metaObject[key]
    };
  });

  writeTable_(spreadsheet, 'Meta', rows);
}

function coerceValue_(value, type) {
  if (type === 'number') {
    var numberValue = Number(value);
    return isNaN(numberValue) ? 0 : numberValue;
  }

  if (type === 'boolean') {
    if (value === true || value === false) return value;
    return String(value).toLowerCase() === 'true';
  }

  if (type === 'json') {
    if (value === '' || value === null || typeof value === 'undefined') {
      return null;
    }
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  return value === null || typeof value === 'undefined' ? '' : String(value);
}

function serializeValue_(value, type) {
  if (type === 'number') {
    var numberValue = Number(value);
    return isNaN(numberValue) ? 0 : numberValue;
  }

  if (type === 'boolean') {
    return value === true;
  }

  if (type === 'json') {
    return JSON.stringify(value === undefined ? null : value);
  }

  return value === null || typeof value === 'undefined' ? '' : String(value);
}

function normalizeState_(state) {
  if (!state || typeof state !== 'object') {
    state = {};
  }

  state.Config_Stages = ensureArray_(state.Config_Stages);
  state.Users = ensureArray_(state.Users);
  state.Teams = ensureArray_(state.Teams);
  state.Purchase_Items = ensureArray_(state.Purchase_Items).map(function(item) {
    return hydratePurchaseItemRecord_(item);
  });
  state.Assignments = ensureArray_(state.Assignments).map(function(assignment) {
    return hydrateAssignmentRecord_(assignment);
  });
  state.Assignment_Submissions = ensureArray_(state.Assignment_Submissions).map(function(submission) {
    return hydrateAssignmentSubmissionRecord_(submission);
  });
  state.Files = ensureArray_(state.Files);
  state.Notifications = ensureArray_(state.Notifications);
  state.Discussion_Comments = ensureArray_(state.Discussion_Comments);
  state.Meta = state.Meta && typeof state.Meta === 'object' ? state.Meta : {};

  state.Files = state.Files.map(function(file) {
    return hydrateFileRecord_(file);
  });
  refreshFileVersionMetadata_(state.Files);

  state.Notifications = state.Notifications.map(function(notification) {
    return hydrateNotificationRecord_(notification);
  });
  state.Discussion_Comments = state.Discussion_Comments.map(function(comment) {
    return hydrateDiscussionCommentRecord_(comment);
  });

  if (state.Notifications.length > 0 && typeof state.Meta.NotificationSeeded === 'undefined') {
    state.Meta.NotificationSeeded = true;
  }

  return state;
}

function hydratePurchaseItemRecord_(item) {
  if (!item || typeof item !== 'object') {
    item = {};
  }

  item.Item_ID = String(item.Item_ID || '');
  item.Stage_ID = String(item.Stage_ID || '');
  item.Item_Name = String(item.Item_Name || '');
  item.Vendor_Price = Number(item.Vendor_Price || 0);
  item.Quantity = Number(item.Quantity || 0);
  item.Created_At = String(item.Created_At || '');
  item.Subtotal = Number(item.Subtotal || item.Vendor_Price * item.Quantity || 0);

  return item;
}

function hydrateAssignmentRecord_(assignment) {
  if (!assignment || typeof assignment !== 'object') {
    assignment = {};
  }

  assignment.Assignment_ID = String(assignment.Assignment_ID || '');
  assignment.Stage_ID = String(assignment.Stage_ID || '');
  assignment.Title = String(assignment.Title || '');
  assignment.Body = String(assignment.Body || '');
  assignment.Submission_Mode = String(assignment.Submission_Mode || 'file-text');
  assignment.Requirement_Text = String(assignment.Requirement_Text || '');
  assignment.Target_Mode = String(assignment.Target_Mode || (ensureArray_(assignment.Target_Team_IDs).length > 0 ? 'selected' : 'all'));
  assignment.Target_Team_IDs = ensureArray_(assignment.Target_Team_IDs).map(function(teamId) {
    return String(teamId || '').trim();
  }).filter(function(teamId) {
    return !!teamId;
  });
  assignment.Due_At = String(assignment.Due_At || '');
  assignment.Created_At = String(assignment.Created_At || nowString_());
  assignment.Created_By_User_ID = String(assignment.Created_By_User_ID || '');
  assignment.Status = String(assignment.Status || '進行中');
  assignment.Allow_ReSubmit = assignment.Allow_ReSubmit !== false;
  assignment.Notify_By_Email = assignment.Notify_By_Email === true;
  assignment.Email_Notification_Sent = assignment.Email_Notification_Sent === true;

  return assignment;
}

function getAssignmentSubmissionModeLabel_(mode) {
  var resolved = String(mode || 'file-text').trim();
  if (resolved === 'file') return '檔案';
  if (resolved === 'text') return '文字';
  return '檔案 + 文字';
}

function getAssignmentTargetTeamIds_(state, assignment) {
  var targetMode = String(assignment && assignment.Target_Mode || 'all');
  if (targetMode !== 'selected') {
    return ensureArray_(state && state.Teams).filter(function(team) {
      return String(team.Team_ID || '') !== 'T00';
    }).map(function(team) {
      return String(team.Team_ID || '').trim();
    }).filter(function(teamId) {
      return !!teamId;
    });
  }

  return ensureArray_(assignment && assignment.Target_Team_IDs).map(function(teamId) {
    return String(teamId || '').trim();
  }).filter(function(teamId) {
    return !!teamId;
  });
}

function getAssignmentTargetTeamLabels_(state, assignment) {
  var targetIds = getAssignmentTargetTeamIds_(state, assignment);
  if (targetIds.length === 0) {
    return '全體小組';
  }

  return targetIds.map(function(teamId) {
    var team = ensureArray_(state && state.Teams).find(function(item) {
      return String(item.Team_ID || '') === teamId;
    });
    return team ? String(team.Team_Name || teamId) : teamId;
  }).join('、');
}

function getAssignmentAnnouncementRecipients_(state, assignment) {
  var targetIds = getAssignmentTargetTeamIds_(state, assignment);
  var recipientsByEmail = {};

  ensureArray_(state && state.Users).forEach(function(user) {
    var email = normalizeEmail_(user.Email);
    if (!email) return;
    if (String(user.Status || '') !== 'Active') return;
    if (['Leader', 'Member'].indexOf(String(user.Role || '')) === -1) return;
    if (targetIds.indexOf(String(user.Team_ID || '').trim()) === -1) return;
    recipientsByEmail[email] = user;
  });

  return Object.keys(recipientsByEmail).map(function(email) {
    return recipientsByEmail[email];
  });
}

function buildAssignmentAnnouncementEmailText_(user, assignment, stageName, targetLabel, frontendUrl) {
  var displayName = String(user && user.Name ? user.Name : '同學').trim() || '同學';
  var dueLabel = formatCompactDateTimeLabel_(assignment.Due_At || '') || '未設定';
  return [
    displayName + ' 您好，',
    '',
    '您所屬小組有一則新的繳交項目通知。',
    '',
    '項目標題：' + String(assignment.Title || ''),
    '會期：' + String(stageName || '未設定'),
    '適用對象：' + String(targetLabel || '全體小組'),
    '截止時間：' + dueLabel,
    '繳交形式：' + getAssignmentSubmissionModeLabel_(assignment.Submission_Mode),
    '允許重新繳交：' + (assignment.Allow_ReSubmit ? '是' : '否'),
    '',
    '項目說明：',
    String(assignment.Body || '（無）'),
    '',
    '繳交需求補充：',
    String(assignment.Requirement_Text || '（無）'),
    '',
    frontendUrl ? '請登入系統查看完整內容：' + frontendUrl : '請登入系統查看完整內容。',
    '',
    '畢展形印組管理系統'
  ].join('\n');
}

function buildAssignmentAnnouncementEmailHtml_(user, assignment, stageName, targetLabel, frontendUrl) {
  var displayName = String(user && user.Name ? user.Name : '同學').trim() || '同學';
  var dueLabel = formatCompactDateTimeLabel_(assignment.Due_At || '') || '未設定';
  var ctaHtml = frontendUrl
    ? '<p><a href="' + escapeHtml_(frontendUrl) + '" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0066CC;color:#FFFFFF;text-decoration:none;font-weight:700;">前往系統查看</a></p>'
    : '';

  return [
    '<div style="font-family:Arial,\'PingFang TC\',\'Microsoft JhengHei\',sans-serif;line-height:1.7;color:#1D1D1F;">',
    '<p>' + escapeHtml_(displayName) + ' 您好，</p>',
    '<p>您所屬小組有一則新的繳交項目通知。</p>',
    '<div style="background:#F5F5F7;border:1px solid #E5E5EA;border-radius:16px;padding:16px;">',
    '<p style="margin:0 0 6px;"><strong>項目標題</strong>：' + escapeHtml_(assignment.Title || '') + '</p>',
    '<p style="margin:0 0 6px;"><strong>會期</strong>：' + escapeHtml_(stageName || '未設定') + '</p>',
    '<p style="margin:0 0 6px;"><strong>適用對象</strong>：' + escapeHtml_(targetLabel || '全體小組') + '</p>',
    '<p style="margin:0 0 6px;"><strong>截止時間</strong>：' + escapeHtml_(dueLabel) + '</p>',
    '<p style="margin:0 0 6px;"><strong>繳交形式</strong>：' + escapeHtml_(getAssignmentSubmissionModeLabel_(assignment.Submission_Mode)) + '</p>',
    '<p style="margin:0;"><strong>允許重新繳交</strong>：' + (assignment.Allow_ReSubmit ? '是' : '否') + '</p>',
    '</div>',
    '<div style="margin-top:16px;">',
    '<p style="margin:0 0 6px;font-weight:700;">項目說明</p>',
    '<p style="margin:0;color:#3A3A3C;white-space:pre-line;">' + escapeHtml_(assignment.Body || '（無）') + '</p>',
    '</div>',
    '<div style="margin-top:16px;">',
    '<p style="margin:0 0 6px;font-weight:700;">繳交需求補充</p>',
    '<p style="margin:0;color:#3A3A3C;white-space:pre-line;">' + escapeHtml_(assignment.Requirement_Text || '（無）') + '</p>',
    '</div>',
    '<div style="margin-top:20px;">' + ctaHtml + '</div>',
    '<p style="font-size:12px;color:#6E6E73;">若您無法使用按鈕，也可以直接前往系統查看完整內容。</p>',
    '<p style="margin-top:24px;">畢展形印組管理系統</p>',
    '</div>'
  ].join('');
}

function sendAssignmentAnnouncementEmail_(state, assignment) {
  if (!assignment || assignment.Notify_By_Email !== true || assignment.Email_Notification_Sent === true) {
    return false;
  }

  var recipients = getAssignmentAnnouncementRecipients_(state, assignment);
  var stage = ensureArray_(state && state.Config_Stages).find(function(item) {
    return String(item.Stage_ID || '') === String(assignment.Stage_ID || '');
  }) || null;
  var stageName = stage ? String(stage.Stage_Name || '') : '';
  var targetLabel = getAssignmentTargetTeamLabels_(state, assignment);
  var frontendUrl = String(getConfig_().frontendBaseUrl || APP_DEFAULTS.frontendBaseUrl || '').trim();
  var subject = '【畢展形印組管理系統】新繳交項目：' + String(assignment.Title || '未命名項目');
  var sentAny = false;

  recipients.forEach(function(user) {
    var email = normalizeEmail_(user.Email);
    if (!email) return;

    var plainText = buildAssignmentAnnouncementEmailText_(user, assignment, stageName, targetLabel, frontendUrl);
    var htmlBody = buildAssignmentAnnouncementEmailHtml_(user, assignment, stageName, targetLabel, frontendUrl);

    try {
      sendSystemEmail_(email, subject, plainText, htmlBody);
      sentAny = true;
    } catch (error) {
      Logger.log('Failed to send assignment announcement email to ' + email + ': ' + error);
    }
  });

  assignment.Email_Notification_Sent = true;
  return sentAny || recipients.length === 0;
}

function sendPendingAssignmentAnnouncementEmails_(state) {
  ensureArray_(state && state.Assignments).forEach(function(assignment) {
    if (!assignment || assignment.Notify_By_Email !== true || assignment.Email_Notification_Sent === true) {
      return;
    }

    sendAssignmentAnnouncementEmail_(state, assignment);
  });
}

function normalizeAssignmentReminderSettings_(rawSettings) {
  var settings = rawSettings && typeof rawSettings === 'object' ? cloneObject_(rawSettings) : {};
  var offsets = ensureArray_(settings.offsetsHours).map(function(value) {
    return Number(value);
  }).filter(function(value) {
    return !isNaN(value) && value > 0;
  }).sort(function(a, b) {
    return a - b;
  });

  if (offsets.length === 0) {
    offsets = ASSIGNMENT_REMINDER_DEFAULT_OFFSETS_HOURS.slice().sort(function(a, b) {
      return a - b;
    });
  }

  return {
    enabled: settings.enabled !== false,
    offsetsHours: offsets,
    sendEmail: settings.sendEmail !== false,
    sendSiteNotifications: settings.sendSiteNotifications !== false
  };
}

function getAssignmentReminderSettings_(state) {
  var metaSettings = state && state.Meta ? state.Meta[ASSIGNMENT_REMINDER_SETTINGS_META_KEY] : null;
  return normalizeAssignmentReminderSettings_(metaSettings);
}

function getAssignmentReminderLog_(state) {
  var rawLog = state && state.Meta ? state.Meta[ASSIGNMENT_REMINDER_LOG_META_KEY] : null;
  if (!rawLog || typeof rawLog !== 'object' || Array.isArray(rawLog)) {
    rawLog = {};
  }
  return rawLog;
}

function buildAssignmentReminderKey_(assignmentId, teamId, reminderCode) {
  return [
    String(assignmentId || '').trim(),
    String(teamId || '').trim(),
    String(reminderCode || '').trim()
  ].join('|');
}

function hasAssignmentSubmissionForTeam_(state, assignmentId, teamId) {
  return ensureArray_(state && state.Assignment_Submissions).some(function(submission) {
    return String(submission.Assignment_ID || '') === String(assignmentId || '')
      && String(submission.Team_ID || '') === String(teamId || '');
  });
}

function getActiveStudentRecipientsForTeam_(state, teamId) {
  return ensureArray_(state && state.Users).filter(function(user) {
    return String(user.Team_ID || '') === String(teamId || '')
      && String(user.Status || '') === 'Active'
      && ['Leader', 'Member'].indexOf(String(user.Role || '')) >= 0
      && normalizeEmail_(user.Email);
  });
}

function getAssignmentReminderBucket_(hoursUntilDue, offsetsHours) {
  if (isNaN(hoursUntilDue)) {
    return null;
  }

  if (hoursUntilDue <= 0) {
    return {
      code: 'overdue',
      label: '已逾期',
      priority: 'high'
    };
  }

  var matchedOffset = ensureArray_(offsetsHours).find(function(offset) {
    return hoursUntilDue <= Number(offset);
  });

  if (!matchedOffset) {
    return null;
  }

  return {
    code: 'before_' + String(matchedOffset).replace(/\./g, '_') + 'h',
    label: formatReminderOffsetLabel_(matchedOffset),
    priority: Number(matchedOffset) <= 6 ? 'high' : 'normal',
    offsetHours: Number(matchedOffset)
  };
}

function formatReminderOffsetLabel_(hours) {
  var numericHours = Number(hours || 0);
  if (numericHours >= 24 && numericHours % 24 === 0) {
    return String(numericHours / 24) + ' 天內';
  }
  return String(numericHours) + ' 小時內';
}

function buildAssignmentReminderNotificationMessage_(assignment, dueAtText, bucket) {
  var dueLabel = formatCompactDateTimeLabel_(dueAtText || assignment.Due_At || '') || '指定時間';

  if (bucket && bucket.code === 'overdue') {
    return '「' + String(assignment.Title || '未命名作業') + '」已於 ' + dueLabel + ' 截止，目前系統仍未收到你的小組繳交。';
  }

  return '「' + String(assignment.Title || '未命名作業') + '」將於 ' + dueLabel + ' 截止，目前系統仍未收到你的小組繳交。';
}

function buildAssignmentReminderEmailText_(user, assignment, stageName, teamName, dueAtText, bucket, frontendUrl) {
  var displayName = String(user && user.Name ? user.Name : '同學').trim() || '同學';
  var dueLabel = formatCompactDateTimeLabel_(dueAtText || assignment.Due_At || '') || '未設定';
  var intro = bucket && bucket.code === 'overdue'
    ? '系統偵測到你的小組目前仍未完成以下作業繳交，且已超過截止時間。'
    : '系統提醒你的小組目前仍未完成以下作業繳交。';

  return [
    displayName + ' 您好，',
    '',
    intro,
    '',
    '項目標題：' + String(assignment.Title || ''),
    '會期：' + String(stageName || '未設定'),
    '所屬小組：' + String(teamName || '未設定'),
    '提醒節點：' + String(bucket && bucket.label ? bucket.label : '截止提醒'),
    '截止時間：' + dueLabel,
    '繳交形式：' + getAssignmentSubmissionModeLabel_(assignment.Submission_Mode),
    '',
    '項目說明：',
    String(assignment.Body || '（無）'),
    '',
    '繳交需求補充：',
    String(assignment.Requirement_Text || '（無）'),
    '',
    frontendUrl ? '請盡快登入系統完成繳交：' + frontendUrl : '請盡快登入系統完成繳交。',
    '',
    '畢展形印組管理系統'
  ].join('\n');
}

function buildAssignmentReminderEmailHtml_(user, assignment, stageName, teamName, dueAtText, bucket, frontendUrl) {
  var displayName = String(user && user.Name ? user.Name : '同學').trim() || '同學';
  var dueLabel = formatCompactDateTimeLabel_(dueAtText || assignment.Due_At || '') || '未設定';
  var intro = bucket && bucket.code === 'overdue'
    ? '系統偵測到你的小組目前仍未完成以下作業繳交，且已超過截止時間。'
    : '系統提醒你的小組目前仍未完成以下作業繳交。';
  var ctaHtml = frontendUrl
    ? '<p><a href="' + escapeHtml_(frontendUrl) + '" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0066CC;color:#FFFFFF;text-decoration:none;font-weight:700;">前往系統完成繳交</a></p>'
    : '';

  return [
    '<div style="font-family:Arial,\'PingFang TC\',\'Microsoft JhengHei\',sans-serif;line-height:1.7;color:#1D1D1F;">',
    '<p>' + escapeHtml_(displayName) + ' 您好，</p>',
    '<p>' + escapeHtml_(intro) + '</p>',
    '<div style="background:#F5F5F7;border:1px solid #E5E5EA;border-radius:16px;padding:16px;">',
    '<p style="margin:0 0 6px;"><strong>項目標題</strong>：' + escapeHtml_(assignment.Title || '') + '</p>',
    '<p style="margin:0 0 6px;"><strong>會期</strong>：' + escapeHtml_(stageName || '未設定') + '</p>',
    '<p style="margin:0 0 6px;"><strong>所屬小組</strong>：' + escapeHtml_(teamName || '未設定') + '</p>',
    '<p style="margin:0 0 6px;"><strong>提醒節點</strong>：' + escapeHtml_(bucket && bucket.label ? bucket.label : '截止提醒') + '</p>',
    '<p style="margin:0 0 6px;"><strong>截止時間</strong>：' + escapeHtml_(dueLabel) + '</p>',
    '<p style="margin:0;"><strong>繳交形式</strong>：' + escapeHtml_(getAssignmentSubmissionModeLabel_(assignment.Submission_Mode)) + '</p>',
    '</div>',
    '<div style="margin-top:16px;">',
    '<p style="margin:0 0 6px;font-weight:700;">項目說明</p>',
    '<p style="margin:0;color:#3A3A3C;white-space:pre-line;">' + escapeHtml_(assignment.Body || '（無）') + '</p>',
    '</div>',
    '<div style="margin-top:16px;">',
    '<p style="margin:0 0 6px;font-weight:700;">繳交需求補充</p>',
    '<p style="margin:0;color:#3A3A3C;white-space:pre-line;">' + escapeHtml_(assignment.Requirement_Text || '（無）') + '</p>',
    '</div>',
    '<div style="margin-top:20px;">' + ctaHtml + '</div>',
    '<p style="font-size:12px;color:#6E6E73;">此信件由 GAS 背景排程自動發送，即使沒有人開啟網站，系統也會依時提醒。</p>',
    '<p style="margin-top:24px;">畢展形印組管理系統</p>',
    '</div>'
  ].join('');
}

function sendAssignmentReminderEmails_(state, recipients, assignment, team, bucket) {
  if (!assignment || assignment.Notify_By_Email !== true) {
    return 0;
  }

  var stage = ensureArray_(state && state.Config_Stages).find(function(item) {
    return String(item.Stage_ID || '') === String(assignment.Stage_ID || '');
  }) || null;
  var stageName = stage ? String(stage.Stage_Name || '') : '';
  var teamName = team ? String(team.Team_Name || '') : '';
  var frontendUrl = String(getConfig_().frontendBaseUrl || APP_DEFAULTS.frontendBaseUrl || '').trim();
  var dueAtText = String(assignment.Due_At || '未設定');
  var subject = bucket && bucket.code === 'overdue'
    ? '【畢展形印組管理系統】逾期提醒：' + String(assignment.Title || '未命名作業')
    : '【畢展形印組管理系統】繳交提醒：' + String(assignment.Title || '未命名作業');
  var sentCount = 0;

  ensureArray_(recipients).forEach(function(user) {
    var email = normalizeEmail_(user.Email);
    if (!email) return;

    try {
      sendSystemEmail_(
        email,
        subject,
        buildAssignmentReminderEmailText_(user, assignment, stageName, teamName, dueAtText, bucket, frontendUrl),
        buildAssignmentReminderEmailHtml_(user, assignment, stageName, teamName, dueAtText, bucket, frontendUrl)
      );
      sentCount += 1;
    } catch (error) {
      Logger.log('Failed to send assignment reminder email to ' + email + ': ' + error);
    }
  });

  return sentCount;
}

function pruneAssignmentReminderLog_(state) {
  var reminderLog = getAssignmentReminderLog_(state);
  var activeAssignmentIds = {};
  var changed = false;

  ensureArray_(state && state.Assignments).forEach(function(assignment) {
    activeAssignmentIds[String(assignment.Assignment_ID || '')] = true;
  });

  Object.keys(reminderLog).forEach(function(key) {
    var entry = reminderLog[key];
    var assignmentId = String(entry && entry.assignmentId || key.split('|')[0] || '').trim();
    if (!activeAssignmentIds[assignmentId]) {
      delete reminderLog[key];
      changed = true;
      return;
    }

    var dueDate = parseConfiguredDateTime_(entry && entry.dueAt);
    if (dueDate && ((new Date().getTime() - dueDate.getTime()) > (45 * 24 * 60 * 60 * 1000))) {
      delete reminderLog[key];
      changed = true;
    }
  });

  state.Meta[ASSIGNMENT_REMINDER_LOG_META_KEY] = reminderLog;
  return changed;
}

function runScheduledAssignmentRemindersInternal_(state) {
  state = normalizeState_(state);
  state.Meta = state.Meta && typeof state.Meta === 'object' ? state.Meta : {};

  var now = new Date();
  var settings = getAssignmentReminderSettings_(state);
  var reminderLog = getAssignmentReminderLog_(state);
  var sweepAt = formatDateTime_(now);
  var summary = {
    ok: true,
    changed: false,
    enabled: settings.enabled,
    checkedAssignments: 0,
    remindedTeams: 0,
    notificationsCreated: 0,
    emailsSent: 0,
    sweepAt: sweepAt
  };

  if (!settings.enabled) {
    state.Meta.LastReminderSweepAt = sweepAt;
    state.Meta.LastReminderSweepSummary = summary;
    summary.changed = true;
    return summary;
  }

  ensureArray_(state.Assignments).forEach(function(assignment) {
    if (!assignment || String(assignment.Status || '') !== '進行中') {
      return;
    }

    var dueDate = parseConfiguredDateTime_(assignment.Due_At);
    if (!dueDate) {
      return;
    }

    var bucket = getAssignmentReminderBucket_((dueDate.getTime() - now.getTime()) / 3600000, settings.offsetsHours);
    if (!bucket) {
      return;
    }

    var targetTeamIds = getAssignmentTargetTeamIds_(state, assignment);
    if (targetTeamIds.length === 0) {
      return;
    }

    summary.checkedAssignments += 1;

    targetTeamIds.forEach(function(teamId) {
      if (hasAssignmentSubmissionForTeam_(state, assignment.Assignment_ID, teamId)) {
        return;
      }

      var reminderKey = buildAssignmentReminderKey_(assignment.Assignment_ID, teamId, bucket.code);
      if (reminderLog[reminderKey]) {
        return;
      }

      var team = ensureArray_(state.Teams).find(function(item) {
        return String(item.Team_ID || '') === String(teamId || '');
      }) || null;
      var recipients = getActiveStudentRecipientsForTeam_(state, teamId);
      var createdNotifications = [];
      var sentEmailCount = 0;

      if (settings.sendSiteNotifications && recipients.length > 0) {
        createdNotifications = createNotifications_(state, {
          type: 'assignment-reminder',
          title: bucket.code === 'overdue'
            ? '作業逾期提醒：' + String(assignment.Title || '未命名作業')
            : '作業繳交提醒：' + String(assignment.Title || '未命名作業'),
          message: buildAssignmentReminderNotificationMessage_(assignment, assignment.Due_At, bucket),
          tab: 'files',
          refType: 'assignment',
          refId: assignment.Assignment_ID,
          audience: {
            userIds: recipients.map(function(user) {
              return String(user.User_ID || '');
            })
          },
          createdAt: sweepAt,
          priority: bucket.priority || 'normal'
        });
      }

      if (settings.sendEmail && recipients.length > 0) {
        sentEmailCount = sendAssignmentReminderEmails_(state, recipients, assignment, team, bucket);
      }

      reminderLog[reminderKey] = {
        assignmentId: String(assignment.Assignment_ID || ''),
        teamId: String(teamId || ''),
        reminderCode: bucket.code,
        dueAt: String(assignment.Due_At || ''),
        sentAt: sweepAt,
        notificationCount: createdNotifications.length,
        emailCount: sentEmailCount
      };

      summary.remindedTeams += 1;
      summary.notificationsCreated += createdNotifications.length;
      summary.emailsSent += sentEmailCount;
      summary.changed = true;
    });
  });

  state.Meta[ASSIGNMENT_REMINDER_LOG_META_KEY] = reminderLog;
  if (pruneAssignmentReminderLog_(state)) {
    summary.changed = true;
  }
  state.Meta.LastReminderSweepAt = sweepAt;
  state.Meta.LastReminderSweepSummary = summary;
  return summary;
}

function hydrateAssignmentSubmissionRecord_(submission) {
  if (!submission || typeof submission !== 'object') {
    submission = {};
  }

  submission.Submission_ID = String(submission.Submission_ID || '');
  submission.Assignment_ID = String(submission.Assignment_ID || '');
  submission.User_ID = String(submission.User_ID || '');
  submission.Team_ID = String(submission.Team_ID || '');
  submission.Submission_No = Number(submission.Submission_No || 1);
  submission.Submission_Mode = String(submission.Submission_Mode || 'file-text');
  submission.File_Name = String(submission.File_Name || '');
  submission.Google_Drive_URL = String(submission.Google_Drive_URL || '');
  submission.Text_Content = String(submission.Text_Content || '');
  submission.Submitted_At = String(submission.Submitted_At || nowString_());
  submission.Updated_At = String(submission.Updated_At || submission.Submitted_At);
  submission.Status = String(submission.Status || '已繳交');
  submission.Notes = String(submission.Notes || '');
  submission.Drive_File_ID = String(submission.Drive_File_ID || '');
  submission.Drive_Folder_ID = String(submission.Drive_Folder_ID || '');

  return submission;
}

function backfillPurchaseItemDates_(state) {
  var changed = false;
  var config = getConfig_();
  var purchaseGroups = {};
  var fileDatesByStage = {};

  ensureArray_(state && state.Files).forEach(function(file) {
    var stageId = String(file.Stage_ID || '').trim();
    var dateKey = extractHeatmapDateKey_(file && file.Upload_Time);
    if (!stageId || !dateKey) return;
    if (!fileDatesByStage[stageId]) {
      fileDatesByStage[stageId] = [];
    }
    fileDatesByStage[stageId].push(dateKey);
  });

  ensureArray_(state && state.Purchase_Items).forEach(function(item, index) {
    var stageId = String(item.Stage_ID || '').trim();
    if (!stageId) {
      stageId = '_ungrouped';
    }

    if (!purchaseGroups[stageId]) {
      purchaseGroups[stageId] = {
        stageId: stageId,
        items: [],
        anchorKeys: []
      };
    }

    purchaseGroups[stageId].items.push({
      item: item,
      index: index
    });

    var itemDateKey = extractHeatmapDateKey_(item && item.Created_At);
    if (itemDateKey) {
      purchaseGroups[stageId].anchorKeys.push(itemDateKey);
    }
  });

  Object.keys(fileDatesByStage).forEach(function(stageId) {
    if (!purchaseGroups[stageId]) {
      purchaseGroups[stageId] = {
        stageId: stageId,
        items: [],
        anchorKeys: []
      };
    }
    purchaseGroups[stageId].anchorKeys = purchaseGroups[stageId].anchorKeys.concat(fileDatesByStage[stageId]);
  });

  Object.keys(purchaseGroups).forEach(function(stageId) {
    var group = purchaseGroups[stageId];
    var missingItems = group.items.filter(function(entry) {
      return !extractHeatmapDateKey_(entry.item && entry.item.Created_At);
    }).sort(function(a, b) {
      var aId = extractSequentialNumber_(a.item && a.item.Item_ID, 'P');
      var bId = extractSequentialNumber_(b.item && b.item.Item_ID, 'P');
      if (aId !== bId) return aId - bId;
      return a.index - b.index;
    });

    if (missingItems.length === 0) {
      return;
    }

    var anchorDateKey = group.anchorKeys.length > 0
      ? group.anchorKeys.slice().sort().pop()
      : Utilities.formatDate(new Date(), config.timeZone, 'yyyy-MM-dd');
    var anchorDate = buildDateFromDateKey_(anchorDateKey);
    var spanDays = missingItems.length > 1
      ? Math.max(7, Math.min(42, (missingItems.length - 1) * 7))
      : 0;
    var gapDays = missingItems.length > 1
      ? Math.max(1, Math.floor(spanDays / (missingItems.length - 1)))
      : 0;

    missingItems.forEach(function(entry, index) {
      var daysBefore = gapDays * (missingItems.length - 1 - index);
      var assignedDate = new Date(anchorDate.getTime());
      assignedDate.setDate(assignedDate.getDate() - daysBefore);
      entry.item.Created_At = formatDateTime_(assignedDate);
      changed = true;
    });
  });

  return changed;
}

function hydrateFileRecord_(file) {
  if (!file || typeof file !== 'object') {
    file = {};
  }

  var parsed = parseFileMeta_(file.File_Name || '');
  file.File_ID = String(file.File_ID || '');
  file.Stage_ID = String(file.Stage_ID || '');
  file.Team_ID = String(file.Team_ID || '');
  file.File_Name = String(file.File_Name || '');
  file.Google_Drive_URL = String(file.Google_Drive_URL || '');
  file.Upload_Time = String(file.Upload_Time || nowString_());
  file.Check_Status = String(file.Check_Status || '未審');
  file.Comment = String(file.Comment || '');
  file.Base_File_Name = String(file.Base_File_Name || parsed.baseName);
  file.File_Extension = String(file.File_Extension || parsed.extension);
  file.Version_No = Number(file.Version_No || parsed.parsedVersion || 1);
  file.File_Group_Key = String(file.File_Group_Key || makeFileGroupKey_(file.Stage_ID, file.Team_ID, file.Base_File_Name));
  file.Revision_Notes = String(file.Revision_Notes || '');
  file.Drive_File_ID = String(file.Drive_File_ID || '');
  file.Drive_Folder_ID = String(file.Drive_Folder_ID || '');
  file.Version_Label = formatVersionLabel_(file.Version_No);
  file.Version_Sequence = Number(file.Version_Sequence || file.Version_No || 1);
  file.Is_Latest = file.Is_Latest === true;

  return file;
}

function hydrateNotificationRecord_(notification) {
  if (!notification || typeof notification !== 'object') {
    notification = {};
  }

  notification.Notification_ID = String(notification.Notification_ID || '');
  notification.User_ID = String(notification.User_ID || '');
  notification.Type = String(notification.Type || 'system');
  if (notification.Type === 'assignment-overdue') {
    notification.Type = 'assignment-reminder';
  }
  notification.Title = normalizeEmbeddedDateTimes_(String(notification.Title || '系統通知'));
  notification.Message = normalizeEmbeddedDateTimes_(String(notification.Message || ''));
  notification.Created_At = normalizeDateTimeStorageValue_(notification.Created_At || nowString_());
  notification.Read = notification.Read === true;
  notification.Tab = String(notification.Tab || 'overview');
  notification.Ref_Type = String(notification.Ref_Type || '');
  notification.Ref_ID = String(notification.Ref_ID || '');
  notification.Priority = String(notification.Priority || 'normal');

  return notification;
}

function hydrateDiscussionCommentRecord_(comment) {
  if (!comment || typeof comment !== 'object') {
    comment = {};
  }

  comment.Comment_ID = String(comment.Comment_ID || '');
  comment.Ref_Type = String(comment.Ref_Type || '');
  comment.Ref_ID = String(comment.Ref_ID || '');
  comment.User_ID = String(comment.User_ID || '');
  comment.Team_ID = String(comment.Team_ID || '');
  comment.Author_Name = String(comment.Author_Name || '未具名');
  comment.Author_Role = String(comment.Author_Role || '');
  comment.Kind = String(comment.Kind || 'comment');
  comment.Message = String(comment.Message || '');
  comment.Created_At = normalizeDateTimeStorageValue_(comment.Created_At || nowString_());

  return comment;
}

function normalizePasswordResetTokenRecord_(record) {
  if (!record || typeof record !== 'object') {
    record = {};
  }

  record.Reset_ID = String(record.Reset_ID || '');
  record.User_ID = String(record.User_ID || '');
  record.Email = normalizeEmail_(record.Email);
  record.Token_Hash = String(record.Token_Hash || '');
  record.Requested_At = String(record.Requested_At || '');
  record.Expires_At = String(record.Expires_At || '');
  record.Consumed_At = String(record.Consumed_At || '');
  record.Status = String(record.Status || 'active').trim().toLowerCase();
  record.Requested_At_Millis = Number(record.Requested_At_Millis || 0);
  record.Expires_At_Millis = Number(record.Expires_At_Millis || 0);
  record.Consumed_At_Millis = Number(record.Consumed_At_Millis || 0);

  if (!record.Requested_At && record.Requested_At_Millis > 0) {
    record.Requested_At = formatDateTime_(new Date(record.Requested_At_Millis));
  }

  if (!record.Expires_At && record.Expires_At_Millis > 0) {
    record.Expires_At = formatDateTime_(new Date(record.Expires_At_Millis));
  }

  if (!record.Consumed_At && record.Consumed_At_Millis > 0) {
    record.Consumed_At = formatDateTime_(new Date(record.Consumed_At_Millis));
  }

  return record;
}

function refreshFileVersionMetadata_(files) {
  var grouped = {};

  ensureArray_(files).forEach(function(file) {
    hydrateFileRecord_(file);
    if (!grouped[file.File_Group_Key]) {
      grouped[file.File_Group_Key] = [];
    }
    grouped[file.File_Group_Key].push(file);
  });

  Object.keys(grouped).forEach(function(groupKey) {
    var groupFiles = grouped[groupKey].slice().sort(function(a, b) {
      var versionDiff = Number(a.Version_No || 1) - Number(b.Version_No || 1);
      if (versionDiff !== 0) return versionDiff;
      return new Date(a.Upload_Time).getTime() - new Date(b.Upload_Time).getTime();
    });

    groupFiles.forEach(function(file, index) {
      file.Version_Sequence = index + 1;
      file.Is_Latest = false;
      file.Version_Label = formatVersionLabel_(file.Version_No);
    });

    var latestFile = groupFiles[groupFiles.length - 1];
    if (latestFile) {
      latestFile.Is_Latest = true;
    }
  });
}

function getAcademicYearRange_() {
  var config = getConfig_();
  var now = new Date();
  var currentYear = Number(Utilities.formatDate(now, config.timeZone, 'yyyy'));
  var currentMonth = Number(Utilities.formatDate(now, config.timeZone, 'M'));
  var startYear = currentMonth >= 8 ? currentYear : currentYear - 1;
  var startDate = new Date(startYear, 7, 1);
  var endDate = new Date(startYear + 1, 6, 31);

  return {
    startDate: startDate,
    endDate: endDate,
    startKey: Utilities.formatDate(startDate, config.timeZone, 'yyyy-MM-dd'),
    endKey: Utilities.formatDate(endDate, config.timeZone, 'yyyy-MM-dd'),
    academicYearLabel: String(startYear) + '-' + String(startYear + 1)
  };
}

function extractHeatmapDateKey_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, getConfig_().timeZone, 'yyyy-MM-dd');
  }

  var raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  var match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function buildDateFromDateKey_(dateKey) {
  var match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return new Date();
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0));
}

function extractSequentialNumber_(value, prefix) {
  var raw = String(value || '');
  var match = raw.match(new RegExp('^' + String(prefix || '') + '(\\d+)$'));
  return match ? parseInt(match[1], 10) : 0;
}

function ensureHeatmapBucket_(bucketMap, dateKey) {
  if (!bucketMap[dateKey]) {
    bucketMap[dateKey] = {
      date: dateKey,
      files: 0,
      purchases: 0,
      assignments: 0,
      total: 0
    };
  }

  return bucketMap[dateKey];
}

function buildHeatmapStats_(state) {
  var config = getConfig_();
  var range = getAcademicYearRange_();
  var buckets = {};
  var summary = {
    files: 0,
    purchases: 0,
    assignments: 0,
    total: 0,
    activeDays: 0,
    peakDate: '',
    peakValue: 0
  };

  ensureArray_(state && state.Files).forEach(function(file) {
    var dateKey = extractHeatmapDateKey_(file && file.Upload_Time);
    if (!dateKey || dateKey < range.startKey || dateKey > range.endKey) {
      return;
    }

    ensureHeatmapBucket_(buckets, dateKey).files += 1;
    summary.files += 1;
  });

  ensureArray_(state && state.Purchase_Items).forEach(function(item) {
    var dateKey = extractHeatmapDateKey_(item && item.Created_At);
    if (!dateKey || dateKey < range.startKey || dateKey > range.endKey) {
      return;
    }

    ensureHeatmapBucket_(buckets, dateKey).purchases += 1;
    summary.purchases += 1;
  });

  ensureArray_(state && state.Assignment_Submissions).forEach(function(submission) {
    var submissionDateKey = extractHeatmapDateKey_(submission && (submission.Submitted_At || submission.Updated_At));
    if (!submissionDateKey || submissionDateKey < range.startKey || submissionDateKey > range.endKey) {
      return;
    }

    ensureHeatmapBucket_(buckets, submissionDateKey).assignments += 1;
    summary.assignments += 1;
  });

  var timeline = [];
  var cursor = new Date(range.startDate.getTime());

  while (cursor <= range.endDate) {
    var dateKey = Utilities.formatDate(cursor, config.timeZone, 'yyyy-MM-dd');
    var bucket = ensureHeatmapBucket_(buckets, dateKey);
    bucket.total = Number(bucket.files || 0) + Number(bucket.purchases || 0) + Number(bucket.assignments || 0);
    timeline.push(cloneObject_(bucket));
    if (bucket.total > 0) {
      summary.activeDays += 1;
    }
    if (bucket.total > summary.peakValue) {
      summary.peakValue = bucket.total;
      summary.peakDate = dateKey;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  summary.total = summary.files + summary.purchases + summary.assignments;

  return {
    range: {
      startDate: range.startKey,
      endDate: range.endKey,
      academicYearLabel: range.academicYearLabel
    },
    timeline: timeline,
    summary: summary
  };
}

function parseFileMeta_(fileName) {
  var rawName = String(fileName || '').trim();
  var dotIndex = rawName.lastIndexOf('.');
  var extension = dotIndex >= 0 ? rawName.slice(dotIndex) : '';
  var nameOnly = dotIndex >= 0 ? rawName.slice(0, dotIndex) : rawName;
  var versionMatch = nameOnly.match(/^(.*?)(?:[ _-]*[Vv](\d+))$/);
  var baseName = versionMatch ? String(versionMatch[1] || '').trim() : nameOnly;
  var parsedVersion = versionMatch ? parseInt(versionMatch[2], 10) : 1;

  return {
    baseName: baseName || nameOnly,
    extension: extension,
    parsedVersion: isNaN(parsedVersion) ? 1 : parsedVersion
  };
}

function makeFileGroupKey_(stageId, teamId, baseName) {
  return [
    String(stageId || '').trim(),
    String(teamId || '').trim(),
    normalizeSearchText_(baseName).replace(/[\s_-]+/g, '')
  ].join('|');
}

function formatVersionLabel_(versionNo) {
  return 'V' + String(versionNo || 1);
}

function buildVersionedFileName_(baseName, versionNo, extension) {
  var cleanBase = String(baseName || '').trim();
  var cleanExtension = String(extension || '');

  if (!cleanBase) {
    return cleanExtension;
  }

  if (!versionNo || Number(versionNo) <= 1) {
    return cleanBase + cleanExtension;
  }

  return cleanBase + 'V' + String(versionNo) + cleanExtension;
}

function buildAssignmentSubmissionFileName_(originalFileName, submissionNo) {
  var rawFileName = String(originalFileName || '').trim();
  var resolvedSubmissionNo = Number(submissionNo || 1);
  var parsed = parseFileMeta_(rawFileName);
  var cleanBase = String(parsed.baseName || '').trim() || rawFileName;
  var cleanExtension = String(parsed.extension || '');

  if (!rawFileName) {
    return cleanExtension || 'submission';
  }

  if (!resolvedSubmissionNo || resolvedSubmissionNo <= 1) {
    return rawFileName;
  }

  return cleanBase + '_第' + String(resolvedSubmissionNo) + '次繳交' + cleanExtension;
}

function isSupportedUploadExtension_(extension) {
  return SUPPORTED_UPLOAD_EXTENSIONS.indexOf(String(extension || '').toLowerCase()) !== -1;
}

function sanitizeDriveEntryName_(value, fallbackValue) {
  var cleaned = String(value || '')
    .replace(/[\\\/]+/g, '・')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned) {
    return cleaned;
  }

  return String(fallbackValue || '').trim();
}

function getLatestFileForGroup_(files, groupKey) {
  var history = ensureArray_(files).filter(function(file) {
    return String(file.File_Group_Key || '') === String(groupKey || '');
  }).sort(function(a, b) {
    var versionDiff = Number(b.Version_No || 1) - Number(a.Version_No || 1);
    if (versionDiff !== 0) return versionDiff;
    return new Date(b.Upload_Time).getTime() - new Date(a.Upload_Time).getTime();
  });

  return history.length > 0 ? history[0] : null;
}

function generateSequentialId_(prefix, collection, field) {
  var maxNumber = ensureArray_(collection).reduce(function(max, item) {
    var raw = String(item && item[field] ? item[field] : '');
    var match = raw.match(new RegExp('^' + prefix + '(\\d+)$'));
    if (!match) return max;
    return Math.max(max, parseInt(match[1], 10));
  }, 0);

  return prefix + padNumber_(maxNumber + 1, 2);
}

function handleLogin_(payload) {
  var state = loadState_();
  var email = normalizeEmail_(payload.email);
  var password = String(payload.password || '');

  if (!email || !password) {
    throw new Error('登入需要電子郵件與密碼。');
  }

  assertLoginAttemptAllowed_(email);

  var user = findUserByEmail_(state.Users, email);
  if (!user) {
    throwLoginFailure_(email);
  }

  if (String(user.Status || '') === 'Pending') {
    recordFailedLoginAttempt_(email);
    throw new Error('此帳號尚未啟用，請改用信箱開通流程。');
  }

  if (!verifyPassword_(password, user.Password)) {
    throwLoginFailure_(email);
  }

  clearFailedLoginAttempts_(email);

  if (!isPasswordHash_(user.Password)) {
    user.Password = hashPassword_(password);
    persistState_(state);
    state = loadState_();
    user = findUserByEmail_(state.Users, email);
  }

  if (isShapePrintUser_(user)) {
    appendActivityLogEntries_([
      createActivityLogEntry_(user, '登入系統', '已登入形印組工作台。', 'session', '', 'info', {
        source: 'login'
      })
    ]);
  }

  return buildAuthenticatedClientResult_(state, user);
}

function getLoginAttemptCacheKey_(email) {
  return 'login-attempt:' + hashSessionToken_(normalizeEmail_(email));
}

function getLoginAttemptState_(email) {
  var raw = CacheService.getScriptCache().get(getLoginAttemptCacheKey_(email));
  if (!raw) return { count: 0, lockedUntil: 0 };
  try {
    var parsed = JSON.parse(raw);
    return {
      count: Number(parsed.count || 0),
      lockedUntil: Number(parsed.lockedUntil || 0)
    };
  } catch (error) {
    return { count: 0, lockedUntil: 0 };
  }
}

function assertLoginAttemptAllowed_(email) {
  var attempt = getLoginAttemptState_(email);
  if (attempt.lockedUntil > Date.now()) {
    throw new Error('登入嘗試過多，請 10 分鐘後再試。');
  }
}

function recordFailedLoginAttempt_(email) {
  var cache = CacheService.getScriptCache();
  var attempt = getLoginAttemptState_(email);
  var count = Number(attempt.count || 0) + 1;
  var lockedUntil = count >= AUTH_LOGIN_MAX_ATTEMPTS
    ? Date.now() + (AUTH_LOGIN_LOCKOUT_SECONDS * 1000)
    : 0;
  cache.put(
    getLoginAttemptCacheKey_(email),
    JSON.stringify({ count: count, lockedUntil: lockedUntil }),
    AUTH_LOGIN_LOCKOUT_SECONDS
  );
}

function clearFailedLoginAttempts_(email) {
  CacheService.getScriptCache().remove(getLoginAttemptCacheKey_(email));
}

function throwLoginFailure_(email) {
  recordFailedLoginAttempt_(email);
  throw new Error('無效的帳號或密碼。');
}

function buildAuthenticatedClientResult_(state, user, extraData) {
  var session = issueSession_(user);
  var data = cloneObject_(extraData || {});
  data.sessionToken = session.token;
  data.sessionExpiresAt = session.expiresAt;
  return buildClientStateResultForUser_(state, user, data);
}

function handleRegisterLeader_(payload) {
  var state = loadState_();
  var teamName = String(payload.teamName || '').trim();
  var name = String(payload.name || '').trim();
  var email = normalizeEmail_(payload.email);
  var password = String(payload.password || payload.pwd || '');

  validateRegistrationPayload_(teamName, name, email, password);

  if (findUserByEmail_(state.Users, email)) {
    throw new Error('該信箱已被註冊。');
  }

  var teamId = generateSequentialId_('T', state.Teams, 'Team_ID');
  var inviteCode = generateInviteCode_(state.Teams);
  var userId = generateSequentialId_('U', state.Users, 'User_ID');
  var newTeam = {
    Team_ID: teamId,
    Team_Name: teamName,
    Invite_Code: inviteCode
  };
  var newUser = {
    User_ID: userId,
    Email: email,
    Password: hashPassword_(password),
    Name: name,
    Team_ID: teamId,
    Role: 'Leader',
    Status: 'Active'
  };

  state.Teams.push(newTeam);
  state.Users.push(newUser);
  persistState_(state);
  state = loadState_();

  appendActivityLogEntries_([
    createActivityLogEntry_(newUser, '建立小組帳號', '已建立小組「' + newTeam.Team_Name + '」與組長帳號。', 'team', newTeam.Team_ID, 'normal', {
      source: 'registerLeader'
    })
  ]);

  return buildAuthenticatedClientResult_(state, findUserByEmail_(state.Users, email), {
    team: newTeam
  });
}

function handleRegisterMember_(payload) {
  var state = loadState_();
  var inviteCode = String(payload.inviteCode || '').trim();
  var name = String(payload.name || '').trim();
  var email = normalizeEmail_(payload.email);
  var password = String(payload.password || payload.pwd || '');
  var targetTeam = state.Teams.find(function(team) {
    return String(team.Invite_Code || '').trim() === inviteCode;
  });

  validateRegistrationPayload_('member', name, email, password);

  if (!inviteCode || !targetTeam) {
    throw new Error('查無此邀請代碼。');
  }

  if (findUserByEmail_(state.Users, email)) {
    throw new Error('該信箱已被註冊。');
  }

  var userId = generateSequentialId_('U', state.Users, 'User_ID');
  var newUser = {
    User_ID: userId,
    Email: email,
    Password: hashPassword_(password),
    Name: name,
    Team_ID: targetTeam.Team_ID,
    Role: 'Member',
    Status: 'Active'
  };

  state.Users.push(newUser);
  persistState_(state);
  state = loadState_();

  appendActivityLogEntries_([
    createActivityLogEntry_(newUser, '加入小組', '已使用邀請碼加入「' + targetTeam.Team_Name + '」。', 'team', targetTeam.Team_ID, 'normal', {
      source: 'registerMember'
    })
  ]);

  return buildAuthenticatedClientResult_(state, findUserByEmail_(state.Users, email), {
    team: targetTeam
  });
}

function handleActivatePending_(payload) {
  var state = loadState_();
  var email = normalizeEmail_(payload.email);
  var name = String(payload.name || '').trim();
  var password = String(payload.password || payload.pwd || '');

  validateRegistrationPayload_('pending', name, email, password);

  var targetUser = findUserByEmail_(state.Users, email);
  if (!targetUser || String(targetUser.Status || '') !== 'Pending') {
    throw new Error('無待開通帳號或此帳號已啟用。');
  }

  targetUser.Name = name;
  targetUser.Password = hashPassword_(password);
  targetUser.Status = 'Active';
  persistState_(state);
  state = loadState_();

  appendActivityLogEntries_([
    createActivityLogEntry_(targetUser, '開通帳號', '已完成帳號開通。', 'user', targetUser.User_ID, 'normal', {
      source: 'activatePending'
    })
  ]);

  return buildAuthenticatedClientResult_(state, findUserByEmail_(state.Users, email));
}

function handleRequestPasswordReset_(payload) {
  var config = getConfig_();
  var email = normalizeEmail_(payload.email);
  var genericMessage = '若此信箱存在，我們已寄出重設連結，請前往信箱收信。';

  if (!email) {
    throw new Error('請輸入有效的電子郵件。');
  }

  if (!config.frontendBaseUrl) {
    throw new Error('尚未設定 FRONTEND_BASE_URL，暫時無法寄送重設連結。');
  }

  var state = loadState_();
  var user = findUserByEmail_(state.Users, email);
  if (!user || String(user.Status || '') !== 'Active') {
    return {
      message: genericMessage
    };
  }

  var tokens = loadPasswordResetTokens_();
  cleanupPasswordResetTokens_(tokens);
  invalidatePasswordResetTokensForUser_(tokens, user.User_ID, 'replaced');

  var requestedAt = new Date();
  var expiresAt = new Date(requestedAt.getTime() + config.passwordResetExpiryMinutes * 60 * 1000);
  var rawToken = generateResetToken_();
  var resetUrl = buildPasswordResetUrl_(rawToken, config.frontendBaseUrl);

  tokens.unshift(normalizePasswordResetTokenRecord_({
    Reset_ID: generateSequentialId_('PR', tokens, 'Reset_ID'),
    User_ID: user.User_ID,
    Email: email,
    Token_Hash: hashResetToken_(rawToken),
    Requested_At: formatDateTime_(requestedAt),
    Expires_At: formatDateTime_(expiresAt),
    Consumed_At: '',
    Status: 'active',
    Requested_At_Millis: requestedAt.getTime(),
    Expires_At_Millis: expiresAt.getTime(),
    Consumed_At_Millis: 0
  }));

  persistPasswordResetTokens_(tokens);

  try {
    sendPasswordResetEmail_(user, resetUrl, formatDateTime_(expiresAt));
  } catch (error) {
    Logger.log('Failed to send password reset email: ' + error);
    throw new Error('重設密碼信寄送失敗，請稍後再試。');
  }

  return {
    message: genericMessage
  };
}

function handlePreviewPasswordReset_(payload) {
  var rawToken = String(payload.token || '').trim();
  if (!rawToken) {
    throw new Error('缺少重設密碼驗證碼。');
  }

  var state = loadState_();
  var tokens = loadPasswordResetTokens_();
  var cleanupChanged = cleanupPasswordResetTokens_(tokens);
  var record = findActivePasswordResetRecord_(tokens, rawToken);

  if (cleanupChanged) {
    persistPasswordResetTokens_(tokens);
  }

  if (!record) {
    throw new Error('此重設連結已失效或已過期。');
  }

  var user = state.Users.find(function(item) {
    return String(item.User_ID || '') === record.User_ID;
  });
  if (!user || String(user.Status || '') !== 'Active') {
    throw new Error('此重設連結已失效或已過期。');
  }

  return {
    email: normalizeEmail_(user.Email || record.Email),
    maskedEmail: maskEmail_(user.Email || record.Email),
    expiresAt: record.Expires_At
  };
}

function handleResetPassword_(payload) {
  var rawToken = String(payload.token || '').trim();
  var password = String(payload.password || '');

  if (!rawToken) {
    throw new Error('缺少重設密碼驗證碼。');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('密碼至少需要 ' + MIN_PASSWORD_LENGTH + ' 碼。');
  }

  var state = loadState_();
  var tokens = loadPasswordResetTokens_();
  var cleanupChanged = cleanupPasswordResetTokens_(tokens);
  var record = findActivePasswordResetRecord_(tokens, rawToken);

  if (!record) {
    if (cleanupChanged) {
      persistPasswordResetTokens_(tokens);
    }
    throw new Error('此重設連結已失效或已過期。');
  }

  var user = state.Users.find(function(item) {
    return String(item.User_ID || '') === record.User_ID;
  });
  if (!user || String(user.Status || '') !== 'Active') {
    throw new Error('此重設連結已失效或已過期。');
  }

  user.Password = hashPassword_(password);
  revokeAllSessionsForUser_(user.User_ID);
  markPasswordResetRecord_(record, 'used');
  invalidatePasswordResetTokensForUser_(tokens, user.User_ID, 'replaced', {
    excludeResetId: record.Reset_ID
  });

  persistState_(state);
  persistPasswordResetTokens_(tokens);

  appendActivityLogEntries_([
    createActivityLogEntry_(user, '更新密碼', '已透過重設流程更新登入密碼。', 'user', user.User_ID, 'warning', {
      source: 'resetPassword'
    })
  ]);

  return {
    message: '密碼已更新，請重新登入。',
    email: normalizeEmail_(user.Email)
  };
}

function handleUploadFile_(payload) {
  var state = loadState_();
  var currentUser = requireStudentUploadActor_(state, payload);
  var fileName = String(payload.fileName || payload.sourceFileName || '').trim();
  var fileContentBase64 = String(payload.fileContentBase64 || payload.base64 || '').trim();
  var mimeType = String(payload.mimeType || 'application/octet-stream').trim();
  var stageId = String(payload.stageId || '').trim();
  var teamId = String(payload.teamId || '').trim();
  var fileSize = Number(payload.fileSize || 0);

  if (!fileName) {
    throw new Error('uploadFile requires `fileName`.');
  }

  if (!fileContentBase64) {
    throw new Error('請直接選擇要上傳的檔案。');
  }

  if (fileSize > MAX_BROWSER_UPLOAD_SIZE_BYTES) {
    throw new Error('檔案超過目前直傳上限 18 MB。');
  }

  var effectiveTeamId = currentUser.Team_ID;

  var activeStage = stageId
    ? state.Config_Stages.find(function(stage) { return stage.Stage_ID === stageId; })
    : state.Config_Stages.find(function(stage) { return stage.Is_Active === true; });
  if (!activeStage) {
    throw new Error('No active stage found for upload.');
  }

  var team = state.Teams.find(function(item) {
    return item.Team_ID === effectiveTeamId;
  });
  if (!team) {
    throw new Error('Team not found: ' + effectiveTeamId);
  }

  var parsedFile = parseFileMeta_(fileName);
  var baseName = String(payload.baseName || parsedFile.baseName || '').trim();
  var extension = String(payload.extension || parsedFile.extension || '').trim();

  if (!extension) {
    throw new Error('檔案名稱需包含副檔名。');
  }

  if (!isSupportedUploadExtension_(extension)) {
    throw new Error('目前只支援 ai、pdf、psd、indd、圖像格式與 zip。');
  }

  var groupKey = String(payload.groupKey || makeFileGroupKey_(activeStage.Stage_ID, effectiveTeamId, baseName)).trim();
  var latestFile = getLatestFileForGroup_(state.Files, groupKey);

  if (latestFile && latestFile.Check_Status !== '退件') {
    throw new Error('Only rejected attachments can be resubmitted.');
  }

  var relatedFiles = state.Files.filter(function(file) {
    return file.File_Group_Key === groupKey;
  });
  var highestVersion = relatedFiles.reduce(function(max, file) {
    return Math.max(max, Number(file.Version_No || 1));
  }, 0);
  var nextVersion = Math.max(highestVersion + 1, Number(payload.nextVersion || parsedFile.parsedVersion || 1));
  var storedFileName = buildVersionedFileName_(baseName, nextVersion, extension);
  var uploadNote = latestFile ? '退件後重新繳交' : '首次繳交';
  var driveResult = createDriveFileFromBase64_(
    fileContentBase64,
    mimeType,
    fileName,
    [activeStage.Stage_Name, team.Team_Name],
    storedFileName
  );
  var uploadTime = nowString_();
  var nextFileId = generateSequentialId_('F', state.Files, 'File_ID');

  var createdFile = hydrateFileRecord_({
    File_ID: nextFileId,
    Stage_ID: activeStage.Stage_ID,
    Team_ID: effectiveTeamId,
    File_Name: storedFileName,
    Google_Drive_URL: driveResult.fileUrl,
    Upload_Time: uploadTime,
    Check_Status: '未審',
    Comment: '',
    Base_File_Name: baseName,
    File_Extension: extension,
    Version_No: nextVersion,
    File_Group_Key: groupKey,
    Revision_Notes: uploadNote,
    Drive_File_ID: driveResult.fileId,
    Drive_Folder_ID: driveResult.folderId
  });

  state.Files.unshift(createdFile);
  refreshFileVersionMetadata_(state.Files);

  createNotifications_(state, {
    type: nextVersion > 1 ? 'file-version' : 'file-upload',
    title: team.Team_Name + ' 已送出附件',
    message: '「' + storedFileName + '」已進入 ' + activeStage.Stage_Name + ' 繳交流程。',
    tab: 'files',
    refType: 'file',
    refId: nextFileId,
    audience: {
      roles: ['SuperAdmin', 'Admin'],
      teamIds: [effectiveTeamId]
    },
    createdAt: uploadTime,
    priority: nextVersion > 1 ? 'high' : 'normal'
  });

  persistState_(state);
  state = loadState_();

  appendActivityLogEntries_([
    createActivityLogEntry_(
      currentUser,
      nextVersion > 1 ? '重新繳交檔案' : '上傳檔案',
      '已將「' + storedFileName + '」送入「' + activeStage.Stage_Name + '」的 ' + team.Team_Name + ' 收件資料夾。',
      'file',
      nextFileId,
      nextVersion > 1 ? 'warning' : 'normal',
      { source: 'uploadFile', teamId: effectiveTeamId, stageId: activeStage.Stage_ID, version: nextVersion }
    )
  ]);

  return buildClientStateResultForUser_(state, currentUser, {
    file: state.Files.find(function(file) {
      return file.File_ID === createdFile.File_ID;
    }) || createdFile,
    drive: driveResult
  });
}

function handleUploadAssignmentAsset_(payload) {
  var state = loadState_();
  var currentUser = requireStudentUploadActor_(state, payload);
  var assignmentId = String(payload.assignmentId || '').trim();
  var fileName = String(payload.fileName || payload.sourceFileName || '').trim();
  var fileContentBase64 = String(payload.fileContentBase64 || payload.base64 || '').trim();
  var mimeType = String(payload.mimeType || 'application/octet-stream').trim();
  var teamId = String(payload.teamId || '').trim();
  var fileSize = Number(payload.fileSize || 0);

  if (!assignmentId) {
    throw new Error('uploadAssignmentAsset requires `assignmentId`.');
  }

  if (!fileName) {
    throw new Error('uploadAssignmentAsset requires `fileName`.');
  }

  if (!fileContentBase64) {
    throw new Error('uploadAssignmentAsset requires `fileContentBase64`.');
  }

  if (fileSize > MAX_BROWSER_UPLOAD_SIZE_BYTES) {
    throw new Error('檔案超過目前直傳上限 18 MB。');
  }

  var assignment = ensureArray_(state.Assignments).find(function(item) {
    return String(item.Assignment_ID || '') === assignmentId;
  });
  if (!assignment) {
    throw new Error('Assignment not found: ' + assignmentId);
  }

  var effectiveTeamId = currentUser.Team_ID;

  if (getAssignmentTargetTeamIds_(state, assignment).indexOf(effectiveTeamId) === -1) {
    throw new Error('這份作業不在此小組的目標範圍內。');
  }

  var stage = ensureArray_(state.Config_Stages).find(function(item) {
    return String(item.Stage_ID || '') === String(assignment.Stage_ID || '');
  }) || ensureArray_(state.Config_Stages).find(function(item) {
    return item.Is_Active === true;
  });
  if (!stage) {
    throw new Error('找不到對應的會審期數。');
  }

  var team = ensureArray_(state.Teams).find(function(item) {
    return String(item.Team_ID || '') === effectiveTeamId;
  });
  if (!team) {
    throw new Error('Team not found: ' + effectiveTeamId);
  }

  var parsedFile = parseFileMeta_(fileName);
  var extension = String(parsedFile.extension || '').trim();
  if (!extension) {
    throw new Error('檔案名稱需包含副檔名。');
  }

  if (!isSupportedUploadExtension_(extension)) {
    throw new Error('目前只支援 ai、pdf、psd、indd、圖像格式與 zip。');
  }

  var existingSubmissions = ensureArray_(state.Assignment_Submissions).filter(function(submission) {
    return String(submission.Assignment_ID || '') === assignment.Assignment_ID
      && String(submission.Team_ID || '') === effectiveTeamId;
  });
  var latestSubmission = existingSubmissions.slice().sort(function(a, b) {
    var numberDiff = Number(b.Submission_No || 1) - Number(a.Submission_No || 1);
    if (numberDiff !== 0) return numberDiff;
    return new Date(b.Submitted_At).getTime() - new Date(a.Submitted_At).getTime();
  })[0] || null;

  if (latestSubmission && assignment.Allow_ReSubmit !== true) {
    throw new Error('此作業目前不開放重新繳交。');
  }

  var nextSubmissionNo = latestSubmission ? Number(latestSubmission.Submission_No || 1) + 1 : 1;
  var storedFileName = buildAssignmentSubmissionFileName_(fileName, nextSubmissionNo);
  var driveResult = createDriveFileFromBase64_(
    fileContentBase64,
    mimeType,
    fileName,
    [stage.Stage_Name, team.Team_Name, '公告作業', assignment.Title],
    storedFileName
  );

  return {
    assignmentId: assignment.Assignment_ID,
    fileName: driveResult.fileName,
    fileUrl: driveResult.fileUrl,
    driveFileId: driveResult.fileId,
    driveFolderId: driveResult.folderId,
    drive: driveResult
  };
}

function handleLargeFileFormUpload_(payload) {
  var state = loadState_();
  var currentUser = requireStudentUploadActor_(state, payload);
  var userId = String(payload.userId || '').trim();
  var stageId = String(payload.stageId || '').trim();
  var teamId = String(payload.teamId || '').trim();
  var groupKey = String(payload.groupKey || '').trim();
  var baseName = String(payload.baseName || '').trim();
  var sourceFileName = String(payload.sourceFileName || '').trim();
  var extension = String(payload.extension || '').trim();
  var sessionKey = String(payload.sessionKey || '').trim();
  var blob = resolveUploadBlob_(payload.uploadFile);
  var fileSize = getBlobSizeBytes_(blob);
  var actualFileName = sanitizeDriveEntryName_(blob.getName && blob.getName(), sourceFileName || 'upload.bin');
  var parsedActualFile = parseFileMeta_(actualFileName);

  if (userId && userId !== String(currentUser.User_ID || '')) {
    throw new Error('FORBIDDEN: 穩定上傳的使用者資訊不符。');
  }

  if (fileSize > MAX_STABLE_WEBAPP_UPLOAD_SIZE_BYTES) {
    throw new Error('檔案超過穩定上傳頁 50 MB 上限。');
  }

  var effectiveTeamId = currentUser.Team_ID;

  var activeStage = stageId
    ? state.Config_Stages.find(function(stage) { return stage.Stage_ID === stageId; })
    : state.Config_Stages.find(function(stage) { return stage.Is_Active === true; });
  if (!activeStage) {
    throw new Error('No active stage found for upload.');
  }

  var team = state.Teams.find(function(item) {
    return item.Team_ID === effectiveTeamId;
  });
  if (!team) {
    throw new Error('Team not found: ' + effectiveTeamId);
  }

  var resolvedBaseName = String(baseName || parsedActualFile.baseName || '').trim();
  var resolvedExtension = String(extension || parsedActualFile.extension || '').trim();
  if (!resolvedBaseName) {
    throw new Error('檔案主名稱不可為空白。');
  }
  if (!resolvedExtension) {
    throw new Error('檔案名稱需包含副檔名。');
  }
  if (!isSupportedUploadExtension_(resolvedExtension)) {
    throw new Error('目前只支援 ai、pdf、psd、indd、圖像格式與 zip。');
  }

  var resolvedGroupKey = String(groupKey || makeFileGroupKey_(activeStage.Stage_ID, effectiveTeamId, resolvedBaseName)).trim();
  var latestFile = getLatestFileForGroup_(state.Files, resolvedGroupKey);
  if (latestFile && latestFile.Check_Status !== '退件') {
    throw new Error('Only rejected attachments can be resubmitted.');
  }

  var relatedFiles = state.Files.filter(function(file) {
    return file.File_Group_Key === resolvedGroupKey;
  });
  var highestVersion = relatedFiles.reduce(function(max, file) {
    return Math.max(max, Number(file.Version_No || 1));
  }, 0);
  var nextVersion = highestVersion + 1;
  var storedFileName = buildVersionedFileName_(resolvedBaseName, nextVersion, resolvedExtension);
  var uploadNote = latestFile ? '退件後重新繳交' : '首次繳交';
  var driveResult = createDriveFileFromBlob_(blob, [activeStage.Stage_Name, team.Team_Name], storedFileName);
  var uploadTime = nowString_();
  var nextFileId = generateSequentialId_('F', state.Files, 'File_ID');

  var createdFile = hydrateFileRecord_({
    File_ID: nextFileId,
    Stage_ID: activeStage.Stage_ID,
    Team_ID: effectiveTeamId,
    File_Name: storedFileName,
    Google_Drive_URL: driveResult.fileUrl,
    Upload_Time: uploadTime,
    Check_Status: '未審',
    Comment: '',
    Base_File_Name: resolvedBaseName,
    File_Extension: resolvedExtension,
    Version_No: nextVersion,
    File_Group_Key: resolvedGroupKey,
    Revision_Notes: uploadNote,
    Drive_File_ID: driveResult.fileId,
    Drive_Folder_ID: driveResult.folderId
  });

  state.Files.unshift(createdFile);
  refreshFileVersionMetadata_(state.Files);

  createNotifications_(state, {
    type: nextVersion > 1 ? 'file-version' : 'file-upload',
    title: team.Team_Name + ' 已送出附件',
    message: '「' + storedFileName + '」已進入 ' + activeStage.Stage_Name + ' 繳交流程。',
    tab: 'files',
    refType: 'file',
    refId: nextFileId,
    audience: {
      roles: ['SuperAdmin', 'Admin'],
      teamIds: [effectiveTeamId]
    },
    createdAt: uploadTime,
    priority: nextVersion > 1 ? 'high' : 'normal'
  });

  persistState_(state);

  appendActivityLogEntries_([
    createActivityLogEntry_(
      currentUser,
      nextVersion > 1 ? '重新繳交檔案' : '上傳檔案',
      '已透過穩定上傳將「' + storedFileName + '」送入「' + activeStage.Stage_Name + '」的 ' + team.Team_Name + ' 收件資料夾。',
      'file',
      nextFileId,
      nextVersion > 1 ? 'warning' : 'normal',
      { source: 'largeFileUpload', teamId: effectiveTeamId, stageId: activeStage.Stage_ID, version: nextVersion }
    )
  ]);

  return {
    status: 'success',
    mode: 'file',
    sessionKey: sessionKey,
    fileId: createdFile.File_ID,
    fileName: createdFile.File_Name,
    fileUrl: createdFile.Google_Drive_URL,
    driveFileId: driveResult.fileId,
    driveFolderId: driveResult.folderId,
    folderPath: driveResult.folderPath,
    uploadedAt: uploadTime
  };
}

function handleLargeAssignmentAssetFormUpload_(payload) {
  var state = loadState_();
  var currentUser = requireStudentUploadActor_(state, payload);
  var userId = String(payload.userId || '').trim();
  var assignmentId = String(payload.assignmentId || '').trim();
  var teamId = String(payload.teamId || '').trim();
  var sessionKey = String(payload.sessionKey || '').trim();
  var sourceFileName = String(payload.sourceFileName || '').trim();
  var blob = resolveUploadBlob_(payload.uploadFile);
  var fileSize = getBlobSizeBytes_(blob);
  var actualFileName = sanitizeDriveEntryName_(blob.getName && blob.getName(), sourceFileName || 'upload.bin');
  var parsedFile = parseFileMeta_(actualFileName);
  var extension = String(parsedFile.extension || '').trim();

  if (userId && userId !== String(currentUser.User_ID || '')) {
    throw new Error('FORBIDDEN: 穩定上傳的使用者資訊不符。');
  }
  if (!assignmentId) {
    throw new Error('穩定上傳缺少 assignmentId。');
  }
  if (fileSize > MAX_STABLE_WEBAPP_UPLOAD_SIZE_BYTES) {
    throw new Error('檔案超過穩定上傳頁 50 MB 上限。');
  }
  if (!extension) {
    throw new Error('檔案名稱需包含副檔名。');
  }
  if (!isSupportedUploadExtension_(extension)) {
    throw new Error('目前只支援 ai、pdf、psd、indd、圖像格式與 zip。');
  }

  var assignment = ensureArray_(state.Assignments).find(function(item) {
    return String(item.Assignment_ID || '') === assignmentId;
  });
  if (!assignment) {
    throw new Error('Assignment not found: ' + assignmentId);
  }

  var effectiveTeamId = currentUser.Team_ID;
  if (getAssignmentTargetTeamIds_(state, assignment).indexOf(effectiveTeamId) === -1) {
    throw new Error('這份作業不在此小組的目標範圍內。');
  }

  var stage = ensureArray_(state.Config_Stages).find(function(item) {
    return String(item.Stage_ID || '') === String(assignment.Stage_ID || '');
  }) || ensureArray_(state.Config_Stages).find(function(item) {
    return item.Is_Active === true;
  });
  if (!stage) {
    throw new Error('找不到對應的會審期數。');
  }

  var team = ensureArray_(state.Teams).find(function(item) {
    return String(item.Team_ID || '') === effectiveTeamId;
  });
  if (!team) {
    throw new Error('Team not found: ' + effectiveTeamId);
  }

  var existingSubmissions = ensureArray_(state.Assignment_Submissions).filter(function(submission) {
    return String(submission.Assignment_ID || '') === assignment.Assignment_ID
      && String(submission.Team_ID || '') === effectiveTeamId;
  });
  var latestSubmission = existingSubmissions.slice().sort(function(a, b) {
    var numberDiff = Number(b.Submission_No || 1) - Number(a.Submission_No || 1);
    if (numberDiff !== 0) return numberDiff;
    return new Date(b.Submitted_At).getTime() - new Date(a.Submitted_At).getTime();
  })[0] || null;

  if (latestSubmission && assignment.Allow_ReSubmit !== true) {
    throw new Error('此作業目前不開放重新繳交。');
  }

  var nextSubmissionNo = latestSubmission ? Number(latestSubmission.Submission_No || 1) + 1 : 1;
  var storedFileName = buildAssignmentSubmissionFileName_(actualFileName, nextSubmissionNo);
  var driveResult = createDriveFileFromBlob_(
    blob,
    [stage.Stage_Name, team.Team_Name, '公告作業', assignment.Title],
    storedFileName
  );

  return {
    status: 'success',
    mode: 'assignment-asset',
    sessionKey: sessionKey,
    assignmentId: assignment.Assignment_ID,
    fileName: driveResult.fileName,
    sourceFileName: actualFileName,
    fileUrl: driveResult.fileUrl,
    driveFileId: driveResult.fileId,
    driveFolderId: driveResult.folderId,
    folderPath: driveResult.folderPath,
    uploadedAt: nowString_()
  };
}

function handleReviewFile_(payload) {
  var state = loadState_();
  var reviewer = requireSessionUser_(state, payload, ['SuperAdmin', 'Admin']);
  var fileId = String(payload.fileId || '').trim();
  var status = String(payload.status || '').trim();
  var comment = String(payload.comment || '').trim();

  if (!fileId) {
    throw new Error('reviewFile requires `fileId`.');
  }

  if (!status) {
    throw new Error('reviewFile requires `status`.');
  }

  if (['未審', '通過', '退件'].indexOf(status) === -1) {
    throw new Error('Unsupported review status: ' + status);
  }

  var targetFile = state.Files.find(function(file) {
    return file.File_ID === fileId;
  });
  if (!targetFile) {
    throw new Error('File not found: ' + fileId);
  }

  if (reviewer.Role === 'Admin' && reviewer.Team_ID === targetFile.Team_ID) {
    throw new Error('Conflict of interest: reviewer cannot review their own team file.');
  }

  targetFile.Check_Status = status;
  targetFile.Comment = status === '退件'
    ? (comment || '退件（未填寫詳細理由）')
    : '';

  createNotifications_(state, {
    type: status === '退件' ? 'file-rejected' : 'file-approved',
    title: status === '退件' ? '檔案退件通知' : '檔案審核通過',
    message: status === '退件'
      ? '「' + targetFile.File_Name + '」已退件。' + (targetFile.Comment ? ' 審核意見：' + targetFile.Comment : '')
      : '「' + targetFile.File_Name + '」已通過審核。',
    tab: 'files',
    refType: 'file',
    refId: targetFile.File_ID,
    audience: {
      roles: ['SuperAdmin', 'Admin'],
      teamIds: [targetFile.Team_ID]
    },
    createdAt: nowString_(),
    priority: status === '退件' ? 'high' : 'normal'
  });

  persistState_(state);
  state = loadState_();

  appendActivityLogEntries_([
    createActivityLogEntry_(
      reviewer,
      status === '退件' ? '退件檔案' : status === '通過' ? '通過檔案審核' : '更新檔案審核',
      '已將「' + targetFile.File_Name + '」標記為「' + status + '」' + (status === '退件' && targetFile.Comment ? '，並附上退件意見。' : '。'),
      'file',
      targetFile.File_ID,
      status === '退件' ? 'warning' : 'normal',
      { source: 'reviewFile', teamId: targetFile.Team_ID, status: status }
    )
  ]);

  return buildClientStateResultForUser_(state, reviewer, {
    file: state.Files.find(function(file) {
      return file.File_ID === targetFile.File_ID;
    }) || hydrateFileRecord_(targetFile)
  });
}

function handleMarkNotificationsRead_(payload) {
  var state = loadState_();
  var currentUser = requireSessionUser_(state, payload);
  var userId = String(currentUser.User_ID || '');
  var notificationIds = ensureArray_(payload.notificationIds).map(function(notificationId) {
    return String(notificationId);
  });
  var markAll = payload.all === true || notificationIds.length === 0;

  state.Notifications.forEach(function(notification) {
    if (notification.User_ID !== userId) return;
    if (markAll || notificationIds.indexOf(notification.Notification_ID) >= 0) {
      notification.Read = true;
    }
  });

  persistState_(state);
  state = loadState_();

  return buildClientStateResultForUser_(state, currentUser, {
    notifications: state.Notifications.filter(function(notification) {
      return notification.User_ID === userId;
    })
  });
}

function handleClearNotifications_(payload) {
  var state = loadState_();
  var currentUser = requireSessionUser_(state, payload);
  var userId = String(currentUser.User_ID || '');
  var scope = String(payload.scope || 'selected').trim();
  var notificationIds = ensureArray_(payload.notificationIds).map(function(notificationId) {
    return String(notificationId);
  });

  state.Notifications = state.Notifications.filter(function(notification) {
    if (notification.User_ID !== userId) {
      return true;
    }

    if (scope === 'all') {
      return false;
    }

    if (scope === 'read') {
      return notification.Read !== true;
    }

    if (scope === 'selected') {
      return notificationIds.indexOf(notification.Notification_ID) === -1;
    }

    return true;
  });

  persistState_(state);
  state = loadState_();

  return buildClientStateResultForUser_(state, currentUser, {
    notifications: state.Notifications.filter(function(notification) {
      return notification.User_ID === userId;
    })
  });
}

function routeDriveFile_(driveUrl, stageName, teamName, targetFileName) {
  var config = getConfig_();
  var fileId = extractDriveFileId_(driveUrl);
  if (!fileId) {
    throw new Error('Unable to parse Google Drive file id from URL.');
  }

  var rootFolder = DriveApp.getFolderById(config.driveRootFolderId);
  var folderContext = getOrCreateNestedFolders_(rootFolder, [stageName, teamName]);
  var teamFolder = folderContext.folder;
  var file = DriveApp.getFileById(fileId);

  try {
    file.setName(sanitizeDriveEntryName_(targetFileName, file.getName()));
    file.moveTo(teamFolder);
  } catch (error) {
    throw new Error('Drive file move failed. Please confirm the script has edit access to the file. Original error: ' + error.message);
  }

  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    folderId: teamFolder.getId(),
    folderName: teamFolder.getName(),
    folderPath: folderContext.path,
    fileName: file.getName()
  };
}

function resolveUploadBlob_(blob) {
  if (!blob || typeof blob.getBytes !== 'function') {
    throw new Error('找不到上傳檔案內容，請重新選擇檔案後再試。');
  }
  return blob;
}

function getBlobSizeBytes_(blob) {
  return resolveUploadBlob_(blob).getBytes().length;
}

function createDriveFileFromBase64_(fileContentBase64, mimeType, sourceFileName, folderSegments, targetFileName) {
  var base64 = String(fileContentBase64 || '').trim();
  if (!base64) {
    throw new Error('Missing `fileContentBase64`.');
  }

  var resolvedSourceFileName = sanitizeDriveEntryName_(sourceFileName, 'upload.bin');
  var resolvedTargetFileName = sanitizeDriveEntryName_(targetFileName, resolvedSourceFileName);
  var resolvedMimeType = String(mimeType || 'application/octet-stream').trim() || 'application/octet-stream';
  var config = getConfig_();
  var rootFolder = DriveApp.getFolderById(config.driveRootFolderId);
  var folderContext = getOrCreateNestedFolders_(rootFolder, folderSegments);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), resolvedMimeType, resolvedTargetFileName);
  var file = folderContext.folder.createFile(blob);

  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    fileName: file.getName(),
    folderId: folderContext.folder.getId(),
    folderName: folderContext.folder.getName(),
    folderPath: folderContext.path
  };
}

function createDriveFileFromBlob_(blob, folderSegments, targetFileName) {
  var resolvedBlob = resolveUploadBlob_(blob);
  var resolvedTargetFileName = sanitizeDriveEntryName_(targetFileName, resolvedBlob.getName && resolvedBlob.getName());
  var contentType = String(resolvedBlob.getContentType && resolvedBlob.getContentType() || 'application/octet-stream').trim() || 'application/octet-stream';
  var config = getConfig_();
  var rootFolder = DriveApp.getFolderById(config.driveRootFolderId);
  var folderContext = getOrCreateNestedFolders_(rootFolder, folderSegments);
  var driveBlob = Utilities.newBlob(resolvedBlob.getBytes(), contentType, resolvedTargetFileName);
  var file = folderContext.folder.createFile(driveBlob);

  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    fileName: file.getName(),
    folderId: folderContext.folder.getId(),
    folderName: folderContext.folder.getName(),
    folderPath: folderContext.path
  };
}

function extractDriveFileId_(driveUrl) {
  var url = String(driveUrl || '').trim();
  if (!url) return '';

  var patterns = [
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/
  ];

  for (var i = 0; i < patterns.length; i += 1) {
    var match = url.match(patterns[i]);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

function getOrCreateFolder_(parentFolder, folderName) {
  var targetName = sanitizeDriveEntryName_(folderName);
  if (!targetName) {
    throw new Error('Folder name is required.');
  }

  var matches = parentFolder.getFoldersByName(targetName);
  if (matches.hasNext()) {
    return matches.next();
  }

  return parentFolder.createFolder(targetName);
}

function getOrCreateNestedFolders_(rootFolder, folderSegments) {
  var currentFolder = rootFolder;
  var pathNames = [rootFolder.getName()];

  ensureArray_(folderSegments).forEach(function(segment) {
    var folderName = sanitizeDriveEntryName_(segment);
    if (!folderName) {
      return;
    }
    currentFolder = getOrCreateFolder_(currentFolder, folderName);
    pathNames.push(currentFolder.getName());
  });

  return {
    folder: currentFolder,
    path: pathNames.join(' / ')
  };
}

function createNotifications_(state, payload) {
  var recipients = resolveNotificationRecipients_(state, payload.audience || {});
  if (recipients.length === 0) {
    return [];
  }

  var currentMax = state.Notifications.reduce(function(max, notification) {
    var raw = String(notification && notification.Notification_ID ? notification.Notification_ID : '');
    var match = raw.match(/^N(\d+)$/);
    if (!match) return max;
    return Math.max(max, parseInt(match[1], 10));
  }, 0);

  var createdAt = String(payload.createdAt || nowString_());
  var createdNotifications = recipients.map(function(userId, index) {
    return hydrateNotificationRecord_({
      Notification_ID: 'N' + padNumber_(currentMax + index + 1, 2),
      User_ID: userId,
      Type: payload.type || 'system',
      Title: payload.title || '系統通知',
      Message: payload.message || '',
      Created_At: createdAt,
      Read: false,
      Tab: payload.tab || 'overview',
      Ref_Type: payload.refType || '',
      Ref_ID: payload.refId || '',
      Priority: payload.priority || 'normal'
    });
  });

  state.Notifications = createdNotifications.concat(state.Notifications);

  if (typeof state.Meta.NotificationSeeded === 'undefined') {
    state.Meta.NotificationSeeded = true;
  }

  return createdNotifications;
}

function resolveNotificationRecipients_(state, audience) {
  var recipientIds = {};
  var userIds = ensureArray_(audience.userIds);
  var roles = ensureArray_(audience.roles);
  var teamIds = ensureArray_(audience.teamIds);
  var excludeUserIds = ensureArray_(audience.excludeUserIds);

  if (audience.allUsers === true) {
    state.Users.forEach(function(user) {
      recipientIds[user.User_ID] = true;
    });
  }

  userIds.forEach(function(userId) {
    recipientIds[String(userId)] = true;
  });

  if (roles.length > 0) {
    state.Users.forEach(function(user) {
      if (roles.indexOf(user.Role) >= 0) {
        recipientIds[user.User_ID] = true;
      }
    });
  }

  if (teamIds.length > 0) {
    state.Users.forEach(function(user) {
      if (teamIds.indexOf(user.Team_ID) >= 0) {
        recipientIds[user.User_ID] = true;
      }
    });
  }

  excludeUserIds.forEach(function(userId) {
    delete recipientIds[String(userId)];
  });

  return Object.keys(recipientIds);
}

function formatDateTime_(dateValue) {
  var config = getConfig_();
  return Utilities.formatDate(new Date(dateValue), config.timeZone, 'yyyy-MM-dd HH:mm');
}

function formatCompactDateTimeLabel_(value) {
  var raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  var simpleMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (simpleMatch) {
    var year = simpleMatch[1];
    var month = simpleMatch[2];
    var day = simpleMatch[3];
    var hour = simpleMatch[4];
    var minute = simpleMatch[5];
    if (hour && minute) {
      return year + '/' + month + '/' + day + ' ' + hour + ':' + minute;
    }
    return year + '/' + month + '/' + day;
  }

  var parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    var config = getConfig_();
    return Utilities.formatDate(parsed, config.timeZone, 'yyyy/MM/dd HH:mm');
  }

  return raw;
}

function normalizeDateTimeStorageValue_(value) {
  var raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  var simpleMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (simpleMatch) {
    var year = simpleMatch[1];
    var month = simpleMatch[2];
    var day = simpleMatch[3];
    var hour = simpleMatch[4] || '00';
    var minute = simpleMatch[5] || '00';
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  }

  var parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return formatDateTime_(parsed);
  }

  return raw;
}

function normalizeEmbeddedDateTimes_(text) {
  var raw = String(text || '');
  if (!raw) {
    return '';
  }

  return raw.replace(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT[+-]\d{4}(?:\s+\([^)]+\))?|(?:\d{4})-(?:\d{2})-(?:\d{2})(?:[ T]\d{2}:\d{2}(?::\d{2})?)/g, function(match) {
    return formatCompactDateTimeLabel_(match);
  });
}

function buildNotificationNormalizationFingerprint_(notification) {
  return JSON.stringify({
    Notification_ID: String(notification && notification.Notification_ID || ''),
    User_ID: String(notification && notification.User_ID || ''),
    Type: String(notification && notification.Type || ''),
    Title: String(notification && notification.Title || ''),
    Message: String(notification && notification.Message || ''),
    Created_At: String(notification && notification.Created_At || ''),
    Read: Boolean(notification && notification.Read),
    Tab: String(notification && notification.Tab || ''),
    Ref_Type: String(notification && notification.Ref_Type || ''),
    Ref_ID: String(notification && notification.Ref_ID || ''),
    Priority: String(notification && notification.Priority || '')
  });
}

function getTimeZoneOffsetString_(timeZone) {
  var offsetRaw = Utilities.formatDate(new Date(), timeZone, 'Z');
  if (!offsetRaw || offsetRaw.length !== 5) {
    return '+00:00';
  }
  return offsetRaw.slice(0, 3) + ':' + offsetRaw.slice(3);
}

function parseConfiguredDateTime_(dateTimeText) {
  var raw = String(dateTimeText || '').trim();
  var match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!match) {
    return null;
  }

  var config = getConfig_();
  var isoText = [
    match[1],
    '-',
    match[2],
    '-',
    match[3],
    'T',
    match[4] || '00',
    ':',
    match[5] || '00',
    ':00',
    getTimeZoneOffsetString_(config.timeZone)
  ].join('');

  var parsed = new Date(isoText);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function nowString_() {
  return formatDateTime_(new Date());
}

function findUserByEmail_(users, email) {
  var normalizedEmail = normalizeEmail_(email);
  return ensureArray_(users).find(function(user) {
    return normalizeEmail_(user.Email) === normalizedEmail;
  }) || null;
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function validateRegistrationPayload_(teamOrMode, name, email, password) {
  if (typeof teamOrMode === 'string' && teamOrMode !== 'member' && teamOrMode !== 'pending' && !String(teamOrMode).trim()) {
    throw new Error('請輸入小組名稱。');
  }

  if (!String(name || '').trim()) {
    throw new Error('請輸入姓名。');
  }

  if (!normalizeEmail_(email)) {
    throw new Error('請輸入有效的電子郵件。');
  }

  if (String(password || '').length < MIN_PASSWORD_LENGTH) {
    throw new Error('密碼至少需要 ' + MIN_PASSWORD_LENGTH + ' 碼。');
  }
}

function generateResetToken_() {
  var raw = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(new Date().getTime())
  ].join('|');
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/g, '');
}

function hashResetToken_(token) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token || ''),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(digest);
}

function cleanupPasswordResetTokens_(tokens) {
  var nowMillis = new Date().getTime();
  var changed = false;

  ensureArray_(tokens).forEach(function(record) {
    normalizePasswordResetTokenRecord_(record);
    if (record.Status === 'active' && record.Expires_At_Millis > 0 && record.Expires_At_Millis <= nowMillis) {
      record.Status = 'expired';
      changed = true;
    }
  });

  return changed;
}

function findActivePasswordResetRecord_(tokens, rawToken) {
  var tokenHash = hashResetToken_(rawToken);
  return ensureArray_(tokens).find(function(record) {
    normalizePasswordResetTokenRecord_(record);
    return record.Token_Hash === tokenHash && record.Status === 'active';
  }) || null;
}

function markPasswordResetRecord_(record, status) {
  if (!record) return;

  var consumedAt = new Date();
  record.Status = String(status || 'used').trim().toLowerCase();
  record.Consumed_At_Millis = consumedAt.getTime();
  record.Consumed_At = formatDateTime_(consumedAt);
}

function invalidatePasswordResetTokensForUser_(tokens, userId, status, options) {
  var targetUserId = String(userId || '').trim();
  var resolvedStatus = String(status || 'replaced').trim().toLowerCase();
  var excludeResetId = options && options.excludeResetId ? String(options.excludeResetId) : '';
  var changed = false;

  ensureArray_(tokens).forEach(function(record) {
    normalizePasswordResetTokenRecord_(record);
    if (record.User_ID !== targetUserId) return;
    if (record.Status !== 'active') return;
    if (excludeResetId && record.Reset_ID === excludeResetId) return;
    markPasswordResetRecord_(record, resolvedStatus);
    changed = true;
  });

  return changed;
}

function maskEmail_(email) {
  var normalizedEmail = normalizeEmail_(email);
  var atIndex = normalizedEmail.indexOf('@');
  if (atIndex <= 0) {
    return normalizedEmail;
  }

  var localPart = normalizedEmail.slice(0, atIndex);
  var domainPart = normalizedEmail.slice(atIndex + 1);
  var maskedLocal = localPart.length <= 2
    ? localPart.charAt(0) + '*'
    : localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);

  return maskedLocal + '@' + domainPart;
}

function buildPasswordResetUrl_(rawToken, baseUrl) {
  var resolvedBaseUrl = String(baseUrl || getConfig_().frontendBaseUrl || '').trim();
  if (!resolvedBaseUrl) {
    throw new Error('Missing FRONTEND_BASE_URL.');
  }

  var hashIndex = resolvedBaseUrl.indexOf('#');
  var hashPart = '';
  if (hashIndex >= 0) {
    hashPart = resolvedBaseUrl.slice(hashIndex);
    resolvedBaseUrl = resolvedBaseUrl.slice(0, hashIndex);
  }

  var separator = resolvedBaseUrl.indexOf('?') >= 0 ? '&' : '?';
  return resolvedBaseUrl + separator + 'mode=reset&token=' + encodeURIComponent(rawToken) + hashPart;
}

function sendPasswordResetEmail_(user, resetUrl, expiresAtText) {
  var subject = '【畢展形印組管理系統】密碼重設連結';
  var recipientName = String(user && user.Name ? user.Name : '同學').trim() || '同學';
  var plainText = [
    recipientName + ' 您好，',
    '',
    '我們收到了重設密碼的請求。請點擊以下連結設定新密碼：',
    resetUrl,
    '',
    '此連結有效至 ' + expiresAtText + '。',
    '若這不是您本人操作，請直接忽略此信。',
    '',
    '畢展形印組管理系統'
  ].join('\n');
  var htmlBody = [
    '<div style="font-family:Arial,\'PingFang TC\',\'Microsoft JhengHei\',sans-serif;line-height:1.7;color:#1D1D1F;">',
    '<p>' + escapeHtml_(recipientName) + ' 您好，</p>',
    '<p>我們收到了重設密碼的請求。請點擊下方按鈕設定新密碼：</p>',
    '<p><a href="' + escapeHtml_(resetUrl) + '" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0066CC;color:#FFFFFF;text-decoration:none;font-weight:700;">前往重設密碼</a></p>',
    '<p style="font-size:12px;color:#6E6E73;">若按鈕無法點擊，也可以複製這段連結到瀏覽器開啟：</p>',
    '<p style="font-size:12px;word-break:break-all;color:#0066CC;">' + escapeHtml_(resetUrl) + '</p>',
    '<p style="font-size:12px;color:#6E6E73;">此連結有效至 ' + escapeHtml_(expiresAtText) + '。若這不是您本人操作，請直接忽略此信。</p>',
    '<p style="margin-top:24px;">畢展形印組管理系統</p>',
    '</div>'
  ].join('');

  sendSystemEmail_(String(user.Email || '').trim(), subject, plainText, htmlBody);
}

function sendSystemEmail_(to, subject, textBody, htmlBody) {
  var config = getConfig_();
  var mailOptions = {
    name: config.mailSenderName || APP_DEFAULTS.mailSenderName,
    htmlBody: String(htmlBody || '')
  };

  if (config.mailReplyTo) {
    mailOptions.replyTo = config.mailReplyTo;
  }

  if (config.mailFromAlias) {
    throw new Error('目前部署版本未啟用 MAIL_FROM_ALIAS。請先清空 MAIL_FROM_ALIAS，或改用 MAIL_REPLY_TO。');
  }

  MailApp.sendEmail(String(to || '').trim(), String(subject || '').trim(), String(textBody || ''), mailOptions);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateInviteCode_(teams) {
  var existingCodes = {};
  ensureArray_(teams).forEach(function(team) {
    existingCodes[String(team.Invite_Code || '').trim()] = true;
  });

  for (var i = 0; i < 50; i += 1) {
    var code = 'SHW-' + padNumber_(Math.floor(Math.random() * 10000), 4);
    if (!existingCodes[code]) {
      return code;
    }
  }

  throw new Error('無法建立唯一邀請碼，請稍後再試。');
}

function isPasswordHash_(value) {
  return String(value || '').indexOf('sha256$') === 0;
}

function hashPassword_(password, salt) {
  var resolvedSalt = String(salt || Utilities.getUuid().replace(/-/g, ''));
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    resolvedSalt + '|' + String(password || ''),
    Utilities.Charset.UTF_8
  );

  return ['sha256', resolvedSalt, Utilities.base64EncodeWebSafe(digest)].join('$');
}

function verifyPassword_(inputPassword, storedPassword) {
  var rawStored = String(storedPassword || '');
  if (!rawStored) {
    return false;
  }

  if (!isPasswordHash_(rawStored)) {
    return rawStored === String(inputPassword || '');
  }

  var parts = rawStored.split('$');
  if (parts.length !== 3) {
    return false;
  }

  return hashPassword_(inputPassword, parts[1]) === rawStored;
}

function normalizeSearchText_(value) {
  return String(value || '').trim().toLowerCase();
}

function ensureArray_(value) {
  return Array.isArray(value) ? value : [];
}

function padNumber_(value, length) {
  var raw = String(value || 0);
  while (raw.length < length) {
    raw = '0' + raw;
  }
  return raw;
}

function cloneObject_(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function withLock_(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse_(ok, data, error) {
  var payload = {
    ok: ok === true,
    data: ok === true ? data : null,
    error: ok === true ? null : {
      message: error && error.message ? error.message : String(error || 'Unknown error')
    },
    serverTime: Utilities.formatDate(new Date(), APP_DEFAULTS.timeZone, 'yyyy-MM-dd HH:mm:ss')
  };

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildDemoState_() {
  return normalizeState_({
    Config_Stages: [
      { Stage_ID: 'S01', Stage_Name: '第一次會審', Budget_Allocated: 150000, Is_Active: false },
      { Stage_ID: 'S02', Stage_Name: '第二次會審', Budget_Allocated: 200000, Is_Active: true },
      { Stage_ID: 'S03', Stage_Name: '第三次總會審', Budget_Allocated: 350000, Is_Active: false }
    ],
    Users: [
      { User_ID: 'U01', Email: 'boss@test.com', Password: '123', Name: '許安迪', Team_ID: 'T00', Role: 'SuperAdmin', Status: 'Active' },
      { User_ID: 'U02', Email: 'staff@test.com', Password: '123', Name: '林心美', Team_ID: 'T02', Role: 'Admin', Status: 'Active' },
      { User_ID: 'U03', Email: 'leader_a@test.com', Password: '123', Name: '王大明', Team_ID: 'T01', Role: 'Leader', Status: 'Active' },
      { User_ID: 'U04', Email: 'member_a@test.com', Password: '123', Name: '李小華', Team_ID: 'T01', Role: 'Member', Status: 'Active' },
      { User_ID: 'U05', Email: 'leader_b@test.com', Password: '123', Name: '張小芬', Team_ID: 'T02', Role: 'Leader', Status: 'Active' },
      { User_ID: 'U06', Email: 'invite_pending@test.com', Password: '', Name: '林待認證', Team_ID: 'T01', Role: 'Member', Status: 'Pending' }
    ],
    Teams: [
      { Team_ID: 'T00', Team_Name: '形印籌備組', Invite_Code: 'ADMINONLY' },
      { Team_ID: 'T01', Team_Name: 'A組_視覺傳達', Invite_Code: 'A-VIS-8241' },
      { Team_ID: 'T02', Team_Name: 'B組_數位多媒體', Invite_Code: 'B-DIG-3175' }
    ],
    Purchase_Items: [
      { Item_ID: 'P01', Stage_ID: 'S02', Item_Name: '大圖背板輸出', Vendor_Price: 8500, Quantity: 2, Created_At: '2026-06-18 09:20', Subtotal: 17000 },
      { Item_ID: 'P02', Stage_ID: 'S02', Item_Name: '精裝專刊印刷', Vendor_Price: 450, Quantity: 120, Created_At: '2026-06-24 14:05', Subtotal: 54000 },
      { Item_ID: 'P03', Stage_ID: 'S02', Item_Name: '導覽酷卡摺頁', Vendor_Price: 15, Quantity: 1000, Created_At: '2026-07-03 11:40', Subtotal: 15000 }
    ],
    Assignments: [
      {
        Assignment_ID: 'A01',
        Stage_ID: 'S02',
        Title: '第二次會審繳交項目｜主視覺定稿與文字說明',
        Body: '請各小組依照第二次會審要求，直接上傳主視覺定稿檔案，並附上 100 字內的說明文字。',
        Submission_Mode: 'file-text',
        Requirement_Text: '需直接上傳作業附件，並附上簡短說明文字。',
        Target_Mode: 'all',
        Target_Team_IDs: ['T01', 'T02'],
        Due_At: '2026-07-10 23:59',
        Created_At: '2026-07-02 18:00',
        Created_By_User_ID: 'U01',
        Status: '進行中',
        Allow_ReSubmit: true
      },
      {
        Assignment_ID: 'A02',
        Stage_ID: 'S02',
        Title: '繳交項目｜印刷前自我檢查表',
        Body: '請各組完成 Pre-flight Checklist，確認字體、色彩模式、出血與解析度都已處理完成後再繳交。',
        Submission_Mode: 'text',
        Requirement_Text: '請直接回覆檢查結果與自評說明文字即可。',
        Target_Mode: 'selected',
        Target_Team_IDs: ['T01'],
        Due_At: '2026-07-08 18:00',
        Created_At: '2026-07-03 09:00',
        Created_By_User_ID: 'U02',
        Status: '進行中',
        Allow_ReSubmit: true
      }
    ],
    Assignment_Submissions: [
      {
        Submission_ID: 'SUB01',
        Assignment_ID: 'A01',
        User_ID: 'U03',
        Team_ID: 'T01',
        Submission_No: 1,
        Submission_Mode: 'file-text',
        File_Name: '主視覺海報_定案V2.pdf',
        Google_Drive_URL: 'https://drive.google.com/open?id=mock_submission_001',
        Text_Content: '已完成 CMYK 與出血線修正，等待印刷前檢查。',
        Submitted_At: '2026-07-03 13:20',
        Updated_At: '2026-07-03 13:20',
        Status: '已繳交',
        Notes: ''
      }
    ],
    Files: [
      {
        File_ID: 'F01',
        Stage_ID: 'S02',
        Team_ID: 'T02',
        File_Name: '宣傳酷卡背面V3.ai',
        Google_Drive_URL: 'https://drive.google.com/open?id=mock_file_001',
        Upload_Time: '2026-07-02 10:15',
        Check_Status: '未審',
        Comment: '',
        Base_File_Name: '宣傳酷卡背面',
        File_Extension: '.ai',
        Version_No: 3,
        File_Group_Key: 'S02|T02|宣傳酷卡背面',
        Revision_Notes: '第二次修訂',
        Drive_File_ID: '',
        Drive_Folder_ID: ''
      },
      {
        File_ID: 'F02',
        Stage_ID: 'S02',
        Team_ID: 'T01',
        File_Name: '主視覺海報_定案.pdf',
        Google_Drive_URL: 'https://drive.google.com/open?id=mock_file_002',
        Upload_Time: '2026-07-01 14:30',
        Check_Status: '退件',
        Comment: '色彩模式格式為 RGB，請修改為 CMYK 後重新繳交。',
        Base_File_Name: '主視覺海報_定案',
        File_Extension: '.pdf',
        Version_No: 1,
        File_Group_Key: 'S02|T01|主視覺海報_定案',
        Revision_Notes: '第一次繳交',
        Drive_File_ID: '',
        Drive_Folder_ID: ''
      }
    ],
    Notifications: [
      {
        Notification_ID: 'N01',
        User_ID: 'U01',
        Type: 'file-upload',
        Title: 'B組上傳新檔案',
        Message: '「宣傳酷卡背面V3.ai」已送交第二次會審，請前往繳交專區查看。',
        Created_At: '2026-07-02 10:15',
        Read: false,
        Tab: 'files',
        Ref_Type: 'file',
        Ref_ID: 'F01',
        Priority: 'normal'
      },
      {
        Notification_ID: 'N02',
        User_ID: 'U02',
        Type: 'file-upload',
        Title: 'B組上傳新檔案',
        Message: '「宣傳酷卡背面V3.ai」已送交第二次會審，請前往繳交專區查看。',
        Created_At: '2026-07-02 10:15',
        Read: false,
        Tab: 'files',
        Ref_Type: 'file',
        Ref_ID: 'F01',
        Priority: 'normal'
      },
      {
        Notification_ID: 'N03',
        User_ID: 'U03',
        Type: 'file-rejected',
        Title: 'A組檔案退件',
        Message: '「主視覺海報_定案.pdf」已退件，請依審核意見修正為 CMYK 後重新繳交。',
        Created_At: '2026-07-01 14:35',
        Read: false,
        Tab: 'files',
        Ref_Type: 'file',
        Ref_ID: 'F02',
        Priority: 'high'
      },
      {
        Notification_ID: 'N04',
        User_ID: 'U04',
        Type: 'file-rejected',
        Title: 'A組檔案退件',
        Message: '「主視覺海報_定案.pdf」已退件，請依審核意見修正為 CMYK 後重新繳交。',
        Created_At: '2026-07-01 14:35',
        Read: false,
        Tab: 'files',
        Ref_Type: 'file',
        Ref_ID: 'F02',
        Priority: 'high'
      },
      {
        Notification_ID: 'N05',
        User_ID: 'U03',
        Type: 'assignment-post',
        Title: '新繳交項目：主視覺定稿與文字說明',
        Message: '「第二次會審繳交項目｜主視覺定稿與文字說明」已發布，請前往繳交專區查看與繳交。',
        Created_At: '2026-07-02 18:00',
        Read: false,
        Tab: 'files',
        Ref_Type: 'assignment',
        Ref_ID: 'A01',
        Priority: 'normal'
      },
      {
        Notification_ID: 'N06',
        User_ID: 'U04',
        Type: 'assignment-post',
        Title: '新繳交項目：主視覺定稿與文字說明',
        Message: '「第二次會審繳交項目｜主視覺定稿與文字說明」已發布，請前往繳交專區查看與繳交。',
        Created_At: '2026-07-02 18:00',
        Read: false,
        Tab: 'files',
        Ref_Type: 'assignment',
        Ref_ID: 'A01',
        Priority: 'normal'
      }
    ],
    Meta: {
      NotificationSeeded: true,
      AssignmentReminderSettings: {
        enabled: true,
        offsetsHours: [72, 24, 6],
        sendEmail: true,
        sendSiteNotifications: true
      },
      AssignmentReminderLog: {}
    }
  });
}
