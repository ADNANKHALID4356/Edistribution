// Company Settings Model
// Purpose: Manage company-wide configuration settings
// Schema source-of-truth: database/migrations/009_company_settings.sql
// IMPORTANT: Column names here must exactly match the MySQL schema.

const db = require('../config/database');

// ---------------------------------------------------------------------------
// Column list — exact MySQL column names from 009_company_settings.sql
// ---------------------------------------------------------------------------
const DB_COLUMNS = [
  'id',
  // Basic Company Information
  'company_name',
  'company_address',
  'company_city',
  'company_state',
  'company_country',
  'company_postal_code',
  // Contact Information
  'company_phone',
  'company_mobile',
  'company_email',
  'company_website',
  // Legal & Tax Information
  'company_tax_number',
  'company_registration_number',
  'company_ntn',
  'company_gst_number',
  // Primary Bank Account
  'bank_name',
  'bank_account_title',
  'bank_account_number',
  'bank_branch',
  'bank_iban',
  'bank_swift_code',
  // Secondary Bank Account
  'bank_name_2',
  'bank_account_title_2',
  'bank_account_number_2',
  'bank_branch_2',
  'bank_iban_2',
  // Branding & Display
  'company_logo_url',
  'company_slogan',
  'invoice_header_text',
  'invoice_footer_text',
  // Business Settings
  'currency_symbol',
  'currency_code',
  'default_tax_percentage',
  'default_credit_days',
  // Timestamps
  'created_at',
  'updated_at',
];

// ---------------------------------------------------------------------------
// Field mapping: frontend payload key → MySQL column name
//
// The MySQL 009_company_settings.sql schema and the frontend CompanySettingsPage
// use identical names for every field, so this is a direct 1:1 map.
// We also accept a handful of legacy aliases so that any old code / calls
// that pass the short form (e.g. "address") still work without breaking.
// ---------------------------------------------------------------------------
const FIELD_MAP = {
  // Direct matches (frontend key === db column)
  company_name:                'company_name',
  company_address:             'company_address',
  company_city:                'company_city',
  company_state:               'company_state',
  company_country:             'company_country',
  company_postal_code:         'company_postal_code',
  company_phone:               'company_phone',
  company_mobile:              'company_mobile',
  company_email:               'company_email',
  company_website:             'company_website',
  company_tax_number:          'company_tax_number',
  company_registration_number: 'company_registration_number',
  company_ntn:                 'company_ntn',
  company_gst_number:          'company_gst_number',
  bank_name:                   'bank_name',
  bank_account_title:          'bank_account_title',
  bank_account_number:         'bank_account_number',
  bank_branch:                 'bank_branch',
  bank_iban:                   'bank_iban',
  bank_swift_code:             'bank_swift_code',
  bank_name_2:                 'bank_name_2',
  bank_account_title_2:        'bank_account_title_2',
  bank_account_number_2:       'bank_account_number_2',
  bank_branch_2:               'bank_branch_2',
  bank_iban_2:                 'bank_iban_2',
  company_logo_url:            'company_logo_url',
  company_slogan:              'company_slogan',
  invoice_header_text:         'invoice_header_text',
  invoice_footer_text:         'invoice_footer_text',
  currency_symbol:             'currency_symbol',
  currency_code:               'currency_code',
  default_tax_percentage:      'default_tax_percentage',
  default_credit_days:         'default_credit_days',

  // Legacy / short-form aliases (old API consumers / local dev)
  address:      'company_address',
  contact:      'company_phone',
  email:        'company_email',
  website:      'company_website',
  tax_number:   'company_tax_number',
  currency:     'currency_code',
  logo_path:    'company_logo_url',
};

// ---------------------------------------------------------------------------
// Converts a raw DB row into the object returned by the API.
// Provides the exact MySQL column names AND a few short aliases so
// downstream code (invoice generation, etc.) keeps working.
// ---------------------------------------------------------------------------
function rowToSettings(row) {
  const s = row;
  return {
    id: s.id,

    // ── Primary names (match MySQL column names) ──────────────────────────
    company_name:                s.company_name                || '',
    company_address:             s.company_address             || '',
    company_city:                s.company_city                || '',
    company_state:               s.company_state               || '',
    company_country:             s.company_country             || 'Pakistan',
    company_postal_code:         s.company_postal_code         || '',
    company_phone:               s.company_phone               || '',
    company_mobile:              s.company_mobile              || '',
    company_email:               s.company_email               || '',
    company_website:             s.company_website             || '',
    company_tax_number:          s.company_tax_number          || '',
    company_registration_number: s.company_registration_number || '',
    company_ntn:                 s.company_ntn                 || '',
    company_gst_number:          s.company_gst_number          || '',
    bank_name:                   s.bank_name                   || '',
    bank_account_title:          s.bank_account_title          || '',
    bank_account_number:         s.bank_account_number         || '',
    bank_branch:                 s.bank_branch                 || '',
    bank_iban:                   s.bank_iban                   || '',
    bank_swift_code:             s.bank_swift_code             || '',
    bank_name_2:                 s.bank_name_2                 || '',
    bank_account_title_2:        s.bank_account_title_2        || '',
    bank_account_number_2:       s.bank_account_number_2       || '',
    bank_branch_2:               s.bank_branch_2               || '',
    bank_iban_2:                 s.bank_iban_2                 || '',
    company_logo_url:            s.company_logo_url            || '',
    company_slogan:              s.company_slogan              || '',
    invoice_header_text:         s.invoice_header_text         || '',
    invoice_footer_text:         s.invoice_footer_text         || '',
    currency_symbol:             s.currency_symbol             || 'Rs.',
    currency_code:               s.currency_code               || 'PKR',
    default_tax_percentage:      s.default_tax_percentage      ?? 0,
    default_credit_days:         s.default_credit_days         ?? 30,

    // ── Legacy aliases (keep backward compat with invoice generator etc.) ──
    address:       s.company_address    || '',
    contact:       s.company_phone      || '',
    email:         s.company_email      || '',
    website:       s.company_website    || '',
    tax_number:    s.company_tax_number || '',
    currency:      s.currency_code      || 'PKR',
    logo_path:     s.company_logo_url   || '',

    created_at: s.created_at,
    updated_at: s.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Sensible defaults for first-run (no row in DB yet)
// ---------------------------------------------------------------------------
function defaultSettings() {
  return {
    company_name:                'Ummahtechinnovations Distribution',
    company_address:             'Office Address, City, Pakistan',
    company_city:                '',
    company_state:               '',
    company_country:             'Pakistan',
    company_postal_code:         '',
    company_phone:               '+92-XXX-XXXXXXX',
    company_mobile:              '',
    company_email:               'info@ummahtechinnovations.com',
    company_website:             '',
    company_tax_number:          '',
    company_registration_number: '',
    company_ntn:                 '',
    company_gst_number:          '',
    bank_name:                   '',
    bank_account_title:          '',
    bank_account_number:         '',
    bank_branch:                 '',
    bank_iban:                   '',
    bank_swift_code:             '',
    bank_name_2:                 '',
    bank_account_title_2:        '',
    bank_account_number_2:       '',
    bank_branch_2:               '',
    bank_iban_2:                 '',
    company_logo_url:            '',
    company_slogan:              '',
    invoice_header_text:         '',
    invoice_footer_text:         '',
    currency_symbol:             'Rs.',
    currency_code:               'PKR',
    default_tax_percentage:      0,
    default_credit_days:         30,
    // legacy aliases
    address:    'Office Address, City, Pakistan',
    contact:    '+92-XXX-XXXXXXX',
    email:      'info@ummahtechinnovations.com',
    website:    '',
    tax_number: '',
    currency:   'PKR',
    logo_path:  '',
  };
}

// ---------------------------------------------------------------------------
// Model class
// ---------------------------------------------------------------------------
class CompanySettings {

  /**
   * GET company settings.
   *
   * NOTE: We do NOT attempt CREATE TABLE here.
   * MySQL: table is created by the 009_company_settings.sql migration.
   * SQLite: table is created by database-sqlite.js → initializeDatabase().
   * Trying to run DDL inside a query() call caused the original 500 error
   * due to the global CURRENT_TIMESTAMP regex replacement in the SQLite wrapper.
   */
  static async getSettings() {
    try {
      const [rows] = await db.query(
        `SELECT ${DB_COLUMNS.join(', ')} FROM company_settings LIMIT 1`
      );

      if (rows && rows.length > 0) {
        return rowToSettings(rows[0]);
      }

      // No row yet — return defaults (INSERT happens on first save)
      return defaultSettings();
    } catch (error) {
      console.error('❌ Error fetching company settings:', error.message);
      throw error;
    }
  }

  /**
   * PUT company settings.
   * Updates the single settings row, or inserts it on first run.
   *
   * Uses only standard SQL (CURRENT_TIMESTAMP) so it is compatible with
   * both MySQL (VPS) and SQLite (local dev via the SQLite wrapper).
   */
  static async updateSettings(settingsData) {
    try {
      // Check whether a row already exists
      const [existing] = await db.query(
        'SELECT id FROM company_settings LIMIT 1'
      );

      if (existing && existing.length > 0) {
        // ── UPDATE ─────────────────────────────────────────────────────────
        const settingsId = existing[0].id;
        const setClauses = [];
        const values     = [];
        const seenCols   = new Set();

        for (const inputKey of Object.keys(settingsData)) {
          const dbCol = FIELD_MAP[inputKey];
          if (dbCol && !seenCols.has(dbCol)) {
            seenCols.add(dbCol);
            setClauses.push(`${dbCol} = ?`);
            values.push(settingsData[inputKey]);
          }
        }

        if (setClauses.length > 0) {
          values.push(settingsId);
          // CURRENT_TIMESTAMP works in both MySQL and SQLite (via db wrapper).
          await db.query(
            `UPDATE company_settings SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
          );
        }

      } else {
        // ── INSERT (first-time setup) ───────────────────────────────────────
        const d = settingsData;
        await db.query(
          `INSERT INTO company_settings (
            company_name, company_address, company_city, company_state,
            company_country, company_postal_code, company_phone, company_mobile,
            company_email, company_website, company_tax_number,
            company_registration_number, company_ntn, company_gst_number,
            bank_name, bank_account_title, bank_account_number,
            bank_branch, bank_iban, bank_swift_code,
            bank_name_2, bank_account_title_2, bank_account_number_2,
            bank_branch_2, bank_iban_2,
            company_logo_url, company_slogan, invoice_header_text,
            invoice_footer_text, currency_symbol, currency_code,
            default_tax_percentage, default_credit_days
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            d.company_name                || 'Company Name',
            d.company_address             || d.address       || '',
            d.company_city                || '',
            d.company_state               || '',
            d.company_country             || 'Pakistan',
            d.company_postal_code         || '',
            d.company_phone               || d.contact       || '',
            d.company_mobile              || '',
            d.company_email               || d.email         || '',
            d.company_website             || d.website       || '',
            d.company_tax_number          || d.tax_number    || '',
            d.company_registration_number || '',
            d.company_ntn                 || '',
            d.company_gst_number          || '',
            d.bank_name                   || '',
            d.bank_account_title          || '',
            d.bank_account_number         || '',
            d.bank_branch                 || '',
            d.bank_iban                   || '',
            d.bank_swift_code             || '',
            d.bank_name_2                 || '',
            d.bank_account_title_2        || '',
            d.bank_account_number_2       || '',
            d.bank_branch_2               || '',
            d.bank_iban_2                 || '',
            d.company_logo_url            || d.logo_path     || '',
            d.company_slogan              || '',
            d.invoice_header_text         || '',
            d.invoice_footer_text         || '',
            d.currency_symbol             || 'Rs.',
            d.currency_code               || d.currency      || 'PKR',
            d.default_tax_percentage      ?? 0,
            d.default_credit_days         ?? 30,
          ]
        );
      }

      // Return fresh settings from DB after update/insert
      return await this.getSettings();

    } catch (error) {
      console.error('❌ Error updating company settings:', error.message);
      throw error;
    }
  }

  /**
   * GET invoice-specific info (used by invoice generator).
   */
  static async getInvoiceInfo() {
    try {
      const s = await this.getSettings();
      return {
        company_name:       s.company_name,
        company_address:    s.company_address,
        company_phone:      s.company_phone,
        company_email:      s.company_email,
        company_tax_number: s.company_tax_number,
        company_logo_url:   s.company_logo_url,
        company_ntn:        s.company_ntn,
        company_gst_number: s.company_gst_number,
        bank_name:          s.bank_name,
        bank_account_number:s.bank_account_number,
        bank_iban:          s.bank_iban,
        invoice_header_text:s.invoice_header_text,
        invoice_footer_text:s.invoice_footer_text,
        currency_symbol:    s.currency_symbol,
        currency_code:      s.currency_code,
      };
    } catch (error) {
      console.error('❌ Error fetching invoice info:', error.message);
      throw error;
    }
  }
}

module.exports = CompanySettings;
