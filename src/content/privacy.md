# Turnip Privacy Policy

**Last Updated:** April 14, 2026

## 1. Who We Are

Turnip is operated by **Miklós Mándoki** (the "maintainer", "we", "us", "our"). We are responsible for how your data is handled when you use the Turnip application or [getturnip.com](https://getturnip.com) (the "Service").

## 2. Privacy Philosophy

Turnip is built on a local-first philosophy. Your habits are your business. By default, your data is stored on your device. You are in control of whether it is ever synced to the cloud.

## 3. Data Collection & Usage

### Local Data

All habit entries, notes, and progress are stored locally on your device (SQLite database). The maintainer does not have access to this data under normal operation of the Service.

### Diagnostic Logs

When you use the app, a rolling diagnostic log is stored locally in the same on-device database as your habits. Log entries contain operation names, internal identifiers, timestamps, and error details — they do not include habit names or other personal content. Logs are automatically deleted after 7 days and capped at 1,000 entries. Logs are never transmitted automatically; they only leave your device if you explicitly export them via **Settings → Export logs** for the purpose of reporting a bug.

### Account Information (Cloud Sync only)

If you enable Cloud Sync, we collect your email address solely for authentication via one-time password (OTP).

### Synced Data (Cloud Sync only)

- Your data is encrypted in transit and at rest.
- Data is stored using [Supabase](https://supabase.com/security), our infrastructure provider and data processor.
- The maintainer acts as the data controller for this information.

### Technical Data

The maintainer and infrastructure providers may collect minimal technical data (such as IP addresses and request metadata) strictly necessary to operate, maintain, and secure the Service.

### Analytics

We do not use third-party trackers and do not sell your data.

## 4. Data Residency & Transfers

- Cloud Sync data is hosted on servers located in Sydney, Australia.
- If you are outside Australia, you acknowledge that your data will be transferred to and processed in Australia when Cloud Sync is enabled.

## 5. Administrative Access & Security

- We use PostgreSQL Row Level Security (RLS) to ensure users can only access their own data.
- As the maintainer and system administrator, the maintainer has administrative access to backend systems for maintenance and security purposes.
- The maintainer maintains a strict no-access policy regarding individual user data and will only access it:
  - If required by law, or
  - At your explicit request for support

Turnip is open source. You are encouraged to review the codebase to verify these claims.

## 6. Data Retention & Deletion

### Local Data

You can delete your local data at any time by clearing the app's storage.

### Cloud Data

You can delete your account and all associated synced data at any time via the app. Deletion is permanent and irreversible.

## 7. Your Rights (EU/UK Users)

If you are located in the European Union or United Kingdom, you have rights under applicable data protection laws, including:

- The right to access your personal data
- The right to correct inaccurate data
- The right to request deletion of your data
- The right to data portability

Because Turnip is local-first, the maintainer may not hold your data unless Cloud Sync is enabled. To exercise your rights, contact: [getturnip@protonmail.com](mailto:getturnip@protonmail.com)

## 8. Children's Privacy

Turnip is not intended for use by children under 13 (or 16 in the EU without parental consent), in accordance with applicable laws including COPPA and GDPR. We do not knowingly collect personal data from children below these thresholds. If we become aware that we have done so, we will delete it as soon as reasonably practicable.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes will be indicated by updating the "Last Updated" date. Continued use of the Service constitutes acceptance of the updated policy.

## 10. Contact

[getturnip@protonmail.com](mailto:getturnip@protonmail.com)
