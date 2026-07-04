var APP_DEFAULTS = {
  timeZone: 'Asia/Taipei',
  spreadsheetId: 'PUT_SPREADSHEET_ID_HERE',
  driveRootFolderId: 'PUT_DRIVE_ROOT_FOLDER_ID_HERE',
  frontendBaseUrl: '',
  mailSenderName: '畢展形印組管理系統',
  mailReplyTo: '',
  mailFromAlias: '',
  passwordResetExpiryMinutes: 30
};

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
    headers: ['Item_ID', 'Stage_ID', 'Item_Name', 'Vendor_Price', 'Quantity', 'Subtotal'],
    types: {
      Vendor_Price: 'number',
      Quantity: 'number',
      Subtotal: 'number'
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
      return jsonResponse_(true, buildClientStateResult_(loadState_()));
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
      result = buildClientStateResult_(loadState_());
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
        setupSheets_();
        if (payload.seedDemo === true) {
          persistState_(buildDemoState_());
        }
        return buildClientStateResult_(loadState_());
      });
      return jsonResponse_(true, result);
    }

    if (action === 'saveState') {
      result = withLock_(function() {
        if (!payload.state || typeof payload.state !== 'object') {
          throw new Error('Missing `state` payload for saveState.');
        }
        persistState_(payload.state);
        return buildClientStateResult_(loadState_());
      });
      return jsonResponse_(true, result);
    }

    if (action === 'uploadFile') {
      result = withLock_(function() {
        return handleUploadFile_(payload);
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
    Files: readTable_(spreadsheet, 'Files'),
    Notifications: readTable_(spreadsheet, 'Notifications'),
    Meta: readMetaSheet_(spreadsheet)
  };

  return normalizeState_(state);
}

function persistState_(inputState) {
  setupSheets_();

  var state = normalizeState_(cloneObject_(inputState));
  var existingState = loadState_();
  state = mergeSensitiveState_(state, existingState);
  var config = getConfig_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);

  writeTable_(spreadsheet, 'Config_Stages', state.Config_Stages);
  writeTable_(spreadsheet, 'Users', state.Users);
  writeTable_(spreadsheet, 'Teams', state.Teams);
  writeTable_(spreadsheet, 'Purchase_Items', state.Purchase_Items);
  writeTable_(spreadsheet, 'Files', state.Files);
  writeTable_(spreadsheet, 'Notifications', state.Notifications);
  writeMetaSheet_(spreadsheet, state.Meta || {});
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

function buildClientStateResult_(state, extraData) {
  var result = cloneObject_(extraData || {});
  result.state = sanitizeStateForClient_(state);
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

function mergeSensitiveState_(nextState, existingState) {
  var usersById = {};
  var usersByEmail = {};

  ensureArray_(existingState && existingState.Users).forEach(function(user) {
    var normalizedEmail = normalizeEmail_(user.Email);
    if (user.User_ID) {
      usersById[String(user.User_ID)] = cloneObject_(user);
    }
    if (normalizedEmail) {
      usersByEmail[normalizedEmail] = cloneObject_(user);
    }
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
  state.Purchase_Items = ensureArray_(state.Purchase_Items);
  state.Files = ensureArray_(state.Files);
  state.Notifications = ensureArray_(state.Notifications);
  state.Meta = state.Meta && typeof state.Meta === 'object' ? state.Meta : {};

  state.Files = state.Files.map(function(file) {
    return hydrateFileRecord_(file);
  });
  refreshFileVersionMetadata_(state.Files);

  state.Notifications = state.Notifications.map(function(notification) {
    return hydrateNotificationRecord_(notification);
  });

  if (state.Notifications.length > 0 && typeof state.Meta.NotificationSeeded === 'undefined') {
    state.Meta.NotificationSeeded = true;
  }

  return state;
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
  notification.Title = String(notification.Title || '系統通知');
  notification.Message = String(notification.Message || '');
  notification.Created_At = String(notification.Created_At || nowString_());
  notification.Read = notification.Read === true;
  notification.Tab = String(notification.Tab || 'overview');
  notification.Ref_Type = String(notification.Ref_Type || '');
  notification.Ref_ID = String(notification.Ref_ID || '');
  notification.Priority = String(notification.Priority || 'normal');

  return notification;
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

  var user = findUserByEmail_(state.Users, email);
  if (!user) {
    throw new Error('無效的帳號或密碼。');
  }

  if (String(user.Status || '') === 'Pending') {
    throw new Error('此帳號尚未啟用，請改用信箱開通流程。');
  }

  if (!verifyPassword_(password, user.Password)) {
    throw new Error('無效的帳號或密碼。');
  }

  if (!isPasswordHash_(user.Password)) {
    user.Password = hashPassword_(password);
    persistState_(state);
    state = loadState_();
    user = findUserByEmail_(state.Users, email);
  }

  return buildClientStateResult_(state, {
    currentUser: sanitizeUserRecord_(user)
  });
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

  return buildClientStateResult_(state, {
    currentUser: sanitizeUserRecord_(findUserByEmail_(state.Users, email)),
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

  return buildClientStateResult_(state, {
    currentUser: sanitizeUserRecord_(findUserByEmail_(state.Users, email)),
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

  return buildClientStateResult_(state, {
    currentUser: sanitizeUserRecord_(findUserByEmail_(state.Users, email))
  });
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

  if (password.length < 3) {
    throw new Error('密碼至少需要 3 碼。');
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
  markPasswordResetRecord_(record, 'used');
  invalidatePasswordResetTokensForUser_(tokens, user.User_ID, 'replaced', {
    excludeResetId: record.Reset_ID
  });

  persistState_(state);
  persistPasswordResetTokens_(tokens);

  return {
    message: '密碼已更新，請重新登入。',
    email: normalizeEmail_(user.Email)
  };
}

function handleUploadFile_(payload) {
  var state = loadState_();
  var userId = String(payload.userId || payload.currentUserId || '').trim();
  var fileName = String(payload.fileName || '').trim();
  var driveUrl = String(payload.googleDriveUrl || payload.driveUrl || payload.url || '').trim();
  var stageId = String(payload.stageId || '').trim();
  var teamId = String(payload.teamId || '').trim();

  if (!userId) {
    throw new Error('uploadFile requires `userId`.');
  }

  if (!fileName) {
    throw new Error('uploadFile requires `fileName`.');
  }

  if (!driveUrl) {
    throw new Error('uploadFile requires `googleDriveUrl`.');
  }

  var currentUser = state.Users.find(function(user) {
    return user.User_ID === userId;
  });
  if (!currentUser) {
    throw new Error('User not found: ' + userId);
  }

  var effectiveTeamId = teamId || currentUser.Team_ID;
  if (!effectiveTeamId || effectiveTeamId === 'T00') {
    throw new Error('Only graduation teams can upload files.');
  }

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
  var groupKey = String(payload.groupKey || makeFileGroupKey_(activeStage.Stage_ID, effectiveTeamId, baseName)).trim();
  var latestFile = getLatestFileForGroup_(state.Files, groupKey);

  if (latestFile && latestFile.Check_Status !== '退件') {
    throw new Error('Only rejected files can be re-uploaded.');
  }

  var relatedFiles = state.Files.filter(function(file) {
    return file.File_Group_Key === groupKey;
  });
  var highestVersion = relatedFiles.reduce(function(max, file) {
    return Math.max(max, Number(file.Version_No || 1));
  }, 0);
  var nextVersion = Math.max(highestVersion + 1, Number(payload.nextVersion || parsedFile.parsedVersion || 1));
  var storedFileName = buildVersionedFileName_(baseName, nextVersion, extension);
  var uploadNote = latestFile ? '退件後重新上傳' : '首次送審';
  var driveResult = routeDriveFile_(driveUrl, activeStage.Stage_Name, team.Team_Name, storedFileName);
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
    title: team.Team_Name + ' 已送交完稿',
    message: '「' + storedFileName + '」已進入 ' + activeStage.Stage_Name + ' 審核流程。',
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

  return buildClientStateResult_(state, {
    file: createdFile,
    drive: driveResult
  });
}

function handleReviewFile_(payload) {
  var state = loadState_();
  var reviewerUserId = String(payload.reviewerUserId || payload.userId || '').trim();
  var fileId = String(payload.fileId || '').trim();
  var status = String(payload.status || '').trim();
  var comment = String(payload.comment || '').trim();

  if (!reviewerUserId) {
    throw new Error('reviewFile requires `reviewerUserId`.');
  }

  if (!fileId) {
    throw new Error('reviewFile requires `fileId`.');
  }

  if (!status) {
    throw new Error('reviewFile requires `status`.');
  }

  if (['未審', '通過', '退件'].indexOf(status) === -1) {
    throw new Error('Unsupported review status: ' + status);
  }

  var reviewer = state.Users.find(function(user) {
    return user.User_ID === reviewerUserId;
  });
  if (!reviewer) {
    throw new Error('Reviewer not found: ' + reviewerUserId);
  }

  if (['SuperAdmin', 'Admin'].indexOf(reviewer.Role) === -1) {
    throw new Error('Only exhibition admins can review files.');
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

  return buildClientStateResult_(state, {
    file: hydrateFileRecord_(targetFile)
  });
}

function handleMarkNotificationsRead_(payload) {
  var state = loadState_();
  var userId = String(payload.userId || '').trim();
  var notificationIds = ensureArray_(payload.notificationIds).map(function(notificationId) {
    return String(notificationId);
  });
  var markAll = payload.all === true || notificationIds.length === 0;

  if (!userId) {
    throw new Error('markNotificationsRead requires `userId`.');
  }

  state.Notifications.forEach(function(notification) {
    if (notification.User_ID !== userId) return;
    if (markAll || notificationIds.indexOf(notification.Notification_ID) >= 0) {
      notification.Read = true;
    }
  });

  persistState_(state);

  return buildClientStateResult_(state, {
    notifications: state.Notifications.filter(function(notification) {
      return notification.User_ID === userId;
    })
  });
}

function handleClearNotifications_(payload) {
  var state = loadState_();
  var userId = String(payload.userId || '').trim();
  var scope = String(payload.scope || 'selected').trim();
  var notificationIds = ensureArray_(payload.notificationIds).map(function(notificationId) {
    return String(notificationId);
  });

  if (!userId) {
    throw new Error('clearNotifications requires `userId`.');
  }

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

  return buildClientStateResult_(state, {
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
  var stageFolder = getOrCreateFolder_(rootFolder, stageName);
  var teamFolder = getOrCreateFolder_(stageFolder, teamName);
  var file = DriveApp.getFileById(fileId);

  try {
    file.setName(targetFileName);
    file.moveTo(teamFolder);
  } catch (error) {
    throw new Error('Drive file move failed. Please confirm the script has edit access to the file. Original error: ' + error.message);
  }

  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    folderId: teamFolder.getId(),
    folderName: teamFolder.getName(),
    folderPath: [rootFolder.getName(), stageFolder.getName(), teamFolder.getName()].join(' / ')
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
  var targetName = String(folderName || '').trim();
  if (!targetName) {
    throw new Error('Folder name is required.');
  }

  var matches = parentFolder.getFoldersByName(targetName);
  if (matches.hasNext()) {
    return matches.next();
  }

  return parentFolder.createFolder(targetName);
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

  if (String(password || '').length < 3) {
    throw new Error('密碼至少需要 3 碼。');
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
    var normalizedAlias = normalizeEmail_(config.mailFromAlias);
    var aliases = GmailApp.getAliases().map(function(alias) {
      return normalizeEmail_(alias);
    });

    if (aliases.indexOf(normalizedAlias) < 0) {
      throw new Error('MAIL_FROM_ALIAS 尚未設定為部署帳號的 Gmail 寄件別名。');
    }

    mailOptions.from = normalizedAlias;
  }

  GmailApp.sendEmail(String(to || '').trim(), String(subject || '').trim(), String(textBody || ''), mailOptions);
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
      { Item_ID: 'P01', Stage_ID: 'S02', Item_Name: '大圖背板輸出', Vendor_Price: 8500, Quantity: 2, Subtotal: 17000 },
      { Item_ID: 'P02', Stage_ID: 'S02', Item_Name: '精裝專刊印刷', Vendor_Price: 450, Quantity: 120, Subtotal: 54000 },
      { Item_ID: 'P03', Stage_ID: 'S02', Item_Name: '導覽酷卡摺頁', Vendor_Price: 15, Quantity: 1000, Subtotal: 15000 }
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
        Comment: '色彩模式格式為 RGB，請修改為 CMYK 後重新上傳。',
        Base_File_Name: '主視覺海報_定案',
        File_Extension: '.pdf',
        Version_No: 1,
        File_Group_Key: 'S02|T01|主視覺海報_定案',
        Revision_Notes: '第一次送審',
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
        Message: '「宣傳酷卡背面V3.ai」已送交第二次會審，請前往檔案收件庫查看。',
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
        Message: '「宣傳酷卡背面V3.ai」已送交第二次會審，請前往檔案收件庫查看。',
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
        Message: '「主視覺海報_定案.pdf」已退件，請依審核意見修正為 CMYK 後重新上傳。',
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
        Message: '「主視覺海報_定案.pdf」已退件，請依審核意見修正為 CMYK 後重新上傳。',
        Created_At: '2026-07-01 14:35',
        Read: false,
        Tab: 'files',
        Ref_Type: 'file',
        Ref_ID: 'F02',
        Priority: 'high'
      }
    ],
    Meta: {
      NotificationSeeded: true
    }
  });
}
