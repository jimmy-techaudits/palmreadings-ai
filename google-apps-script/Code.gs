/**
 * Palm Readings AI: Google Workspace connection.
 *
 * A web app the website calls to:
 *   - email contact form messages to hello@palmreadings.ai (sent from your Workspace account,
 *     with Reply set to the visitor), and log them;
 *   - log feedback and anonymous usage events;
 *   - email private reading links (after a free reading, to people who gave their email, and after
 *     a purchase), and keep the "Subscribers" tab in step with the site's subscriber list.
 * Everything is logged to tabs in the Google Sheet this script is attached to.
 *
 * Setup (see "Contact form and Google Workspace" in the README):
 *   1. In Google Drive (signed in to your Workspace), create a Google Sheet, e.g. "Palm Readings AI log".
 *   2. Extensions > Apps Script. Replace the code with this file. Save.
 *   3. Project Settings (gear) > Script properties > Add property:
 *        SECRET = a long random string (the same value goes in GOOGLE_SCRIPT_SECRET on the website).
 *      Optional: CONTACT_TO = the address that receives contact messages (default hello@palmreadings.ai).
 *      Optional: FROM_ALIAS = a "Send mail as" alias of this account to send reading emails from, e.g.
 *      hello@palmreadings.ai if the script runs under another account. Leave unset to send as the account.
 *   4. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone. Deploy and
 *      authorize. Copy the web app URL into GOOGLE_SCRIPT_URL on the website.
 *   5. After editing this code later: Deploy > Manage deployments > edit > Version: New version.
 */

const DEFAULT_TO = 'hello@palmreadings.ai';

const TABS = {
  contact: ['Received', 'Name', 'Email', 'Subject', 'Message'],
  feedback: ['Received', 'Rating', 'Comment', 'Mode', 'Focus'],
  usage: ['Received', 'Mode', 'Focus', 'Marriage & children', 'Curious about', 'Photos', 'AI provider', 'Free or paid'],
  emails: ['Sent', 'To', 'Subject'],
  subscribers: ['Updated', 'Email', 'Status', 'Consent wording'],
};

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'Invalid JSON' });
  }

  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('SECRET');
  if (!secret || data.secret !== secret) return reply({ ok: false, error: 'Unauthorized' });

  try {
    switch (data.action) {
      case 'contact':
        sendContactEmail(data, props.getProperty('CONTACT_TO') || DEFAULT_TO);
        log('contact', [data.timestamp, data.name, data.email, data.subject, data.message]);
        break;
      case 'feedback':
        log('feedback', [data.timestamp, data.rating === 1 ? 'Spot on' : 'Off base', data.comment, data.mode, data.focus]);
        break;
      case 'usage':
        log('usage', [data.timestamp, data.mode, data.focus, data.includeFamily ? 'Yes' : 'No', data.curious, data.photoCount, data.provider, data.paid]);
        break;
      case 'email':
        sendEmail(data, props.getProperty('FROM_ALIAS'));
        log('emails', [data.timestamp, data.to, data.subject]);
        break;
      case 'subscriber':
        upsertSubscriber(data);
        break;
      default:
        return reply({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: String(err) });
  }
  return reply({ ok: true });
}

function sendContactEmail(data, to) {
  const subject = '[palmreadings.ai] ' + clean(data.subject || 'Website inquiry', 150);
  const body =
    'New message from the palmreadings.ai contact form.\n\n' +
    'From: ' + clean(data.name, 100) + ' <' + clean(data.email, 200) + '>\n' +
    'Subject: ' + clean(data.subject, 150) + '\n\n' +
    clean(data.message, 5000) +
    '\n\nReply to this email to answer them directly.';
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    replyTo: clean(data.email, 200),
    name: 'Palm Readings AI website',
  });
}

function sendEmail(data, alias) {
  const options = { name: 'Palm Readings AI' };
  if (alias) {
    options.from = alias;
    GmailApp.sendEmail(clean(data.to, 200), clean(data.subject, 200), clean(data.body, 10000), options);
  } else {
    MailApp.sendEmail({ to: clean(data.to, 200), subject: clean(data.subject, 200), body: clean(data.body, 10000), name: options.name });
  }
}

/** One row per email in the "Subscribers" tab: updated in place when someone unsubscribes or re-subscribes. */
function upsertSubscriber(data) {
  const sheet = tabSheet('subscribers');
  const email = clean(data.email, 200).toLowerCase();
  const values = sheet.getRange(1, 2, Math.max(sheet.getLastRow(), 1), 1).getValues();
  const row = [data.timestamp, email, data.status, data.consentText || ''];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === email) {
      if (!data.consentText) row[3] = sheet.getRange(i + 1, 4).getValue();
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function tabSheet(tab) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = tab.charAt(0).toUpperCase() + tab.slice(1);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(TABS[tab]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, TABS[tab].length).setFontWeight('bold');
  }
  return sheet;
}

function log(tab, row) {
  // Prefix values that a spreadsheet would treat as formulas, so a message can't inject one.
  tabSheet(tab).appendRow(
    row.map((v) => {
      const s = v === undefined || v === null ? '' : String(v);
      return /^[=+\-@]/.test(s) ? "'" + s : s;
    }),
  );
}

function clean(value, max) {
  return String(value === undefined || value === null ? '' : value).slice(0, max);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
