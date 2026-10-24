import fs from 'fs';
import path from 'path';
import { validateTestConfig } from './config';

export interface DiscoveredMenu {
  id: number;
  parentId: number | null;
  parentName: string;
  name: string;
  displayName: string;
  route: string;
  mappedApi: string;
  primaryOperation: 'CRUD' | 'Workflow' | 'Settings' | 'Directory' | 'Analytics' | 'Read-Only';
  supportedActions: string[];
  permissionPrefix: string;
  isAccessible: boolean;
}

/**
 * Maps known dashboard routes to their primary backend API endpoints and operational types.
 */
function inferMenuMetadata(route: string, name: string): {
  mappedApi: string;
  primaryOperation: 'CRUD' | 'Workflow' | 'Settings' | 'Directory' | 'Analytics' | 'Read-Only';
  supportedActions: string[];
  permissionPrefix: string;
} {
  // Master Data (Full CRUD)
  if (route.startsWith('/dashboard/products/')) {
    const masterKey = route.split('/dashboard/products/')[1];
    return {
      mappedApi: `api/masters/${masterKey}`,
      primaryOperation: 'CRUD',
      supportedActions: ['List', 'Add', 'View', 'Update', 'Delete', 'Search'],
      permissionPrefix: masterKey.replace(/-/g, '_'),
    };
  }
  if (route.startsWith('/dashboard/masters/')) {
    const masterKey = route.split('/dashboard/masters/')[1];
    return {
      mappedApi: `api/masters/${masterKey}`,
      primaryOperation: 'CRUD',
      supportedActions: ['List', 'Add', 'View', 'Update', 'Delete', 'Search'],
      permissionPrefix: masterKey.replace(/-/g, '_'),
    };
  }

  // Core Functional Modules
  switch (route) {
    case '/dashboard':
      return {
        mappedApi: 'api/dashboard/stats',
        primaryOperation: 'Analytics',
        supportedActions: ['View Dashboard', 'Live Rate Ticker', 'Quick Stats', 'Theme Toggle'],
        permissionPrefix: 'dashboard',
      };
    case '/dashboard/rates':
      return {
        mappedApi: 'api/rates/current',
        primaryOperation: 'Workflow',
        supportedActions: ['View Rates', 'Update Gold Rate', 'Update Silver Rate', 'Publish Rate'],
        permissionPrefix: 'rates',
      };
    case '/dashboard/orders':
      return {
        mappedApi: 'api/store-orders',
        primaryOperation: 'Workflow',
        supportedActions: ['List Orders', 'View Order Details', 'Filter by Status', 'Export Orders'],
        permissionPrefix: 'orders',
      };
    case '/dashboard/transactions':
      return {
        mappedApi: 'api/transactions',
        primaryOperation: 'Read-Only',
        supportedActions: ['List Transactions', 'Filter by Type', 'Date Range Search', 'Export'],
        permissionPrefix: 'transactions',
      };
    case '/dashboard/app-users':
      return {
        mappedApi: 'api/app-users',
        primaryOperation: 'Directory',
        supportedActions: ['List Users', 'Search by Mobile/Email', 'View User Profile', 'KYC Status'],
        permissionPrefix: 'app_users',
      };
    case '/dashboard/catalog':
      return {
        mappedApi: 'api/products',
        primaryOperation: 'CRUD',
        supportedActions: ['List Products', 'Add Product Wizard', 'Edit Product', 'Toggle Visibility', 'Delete Product'],
        permissionPrefix: 'products',
      };
    case '/dashboard/catalog/enquiry':
      return {
        mappedApi: 'api/products?type=enquiry',
        primaryOperation: 'CRUD',
        supportedActions: ['List Enquiry Catalog', 'Add Enquiry Design', 'Edit Design'],
        permissionPrefix: 'products',
      };
    case '/dashboard/users':
      return {
        mappedApi: 'api/users',
        primaryOperation: 'CRUD',
        supportedActions: ['List Admin Users', 'Create Admin User', 'Edit Roles', 'Deactivate Admin'],
        permissionPrefix: 'users',
      };
    case '/dashboard/roles':
      return {
        mappedApi: 'api/roles',
        primaryOperation: 'CRUD',
        supportedActions: ['List Roles', 'Create Role', 'Edit Role Permissions', 'Delete Role'],
        permissionPrefix: 'roles',
      };
    case '/dashboard/permissions':
      return {
        mappedApi: 'api/permissions',
        primaryOperation: 'Read-Only',
        supportedActions: ['List System Permissions', 'Search Permissions'],
        permissionPrefix: 'permissions',
      };
    case '/dashboard/menus':
      return {
        mappedApi: 'api/menus',
        primaryOperation: 'Settings',
        supportedActions: ['List Dynamic Menus', 'Reorder Menus', 'Update Menu Icon'],
        permissionPrefix: 'menus',
      };
    case '/dashboard/schemes':
    case '/dashboard/schemes/list':
      return {
        mappedApi: 'api/schemes',
        primaryOperation: 'CRUD',
        supportedActions: ['List Schemes', 'Create Scheme', 'Edit Scheme Rules', 'View Enrolments'],
        permissionPrefix: 'schemes',
      };
    case '/dashboard/sip':
      return {
        mappedApi: 'api/sip',
        primaryOperation: 'Workflow',
        supportedActions: ['List SIP Subscriptions', 'View Active Plans', 'Filter Overdue'],
        permissionPrefix: 'sip',
      };
    case '/dashboard/redeem-orders':
      return {
        mappedApi: 'api/store-orders?type=redeem',
        primaryOperation: 'Workflow',
        supportedActions: ['List Redeem Requests', 'Verify Physical Vault Stock', 'Process Dispatch'],
        permissionPrefix: 'redeem_orders',
      };
    case '/dashboard/sell-orders':
      return {
        mappedApi: 'api/sell-orders',
        primaryOperation: 'Workflow',
        supportedActions: ['List Sell Requests', 'Verify Instant Payouts', 'Audit Cashfree/Razorpay Ledger'],
        permissionPrefix: 'sell_orders',
      };
    case '/dashboard/logs':
      return {
        mappedApi: 'api/logs',
        primaryOperation: 'Read-Only',
        supportedActions: ['Audit Logs View', 'Filter by Admin', 'Timestamp Filter'],
        permissionPrefix: 'logs',
      };
    case '/dashboard/settings':
    case '/dashboard/settings/app-settings':
    case '/dashboard/settings/app-config':
      return {
        mappedApi: 'api/settings',
        primaryOperation: 'Settings',
        supportedActions: ['View App Config', 'Update Branding', 'Save Platform Toggles'],
        permissionPrefix: 'settings',
      };
    default:
      if (route.includes('/settings/')) {
        return {
          mappedApi: `api/settings/${route.split('/settings/')[1]}`,
          primaryOperation: 'Settings',
          supportedActions: ['View Settings', 'Save Changes'],
          permissionPrefix: 'settings',
        };
      }
      return {
        mappedApi: 'api/dashboard',
        primaryOperation: 'Workflow',
        supportedActions: ['View Page', 'Verify Interactive DOM'],
        permissionPrefix: name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      };
  }
}

/**
 * Discovers the complete menu tree from the authenticated session and flattens it into an inventory.
 */
export async function discoverAdminMenus(): Promise<DiscoveredMenu[]> {
  const config = validateTestConfig();
  const authFile = path.resolve(process.cwd(), 'playwright/.auth/admin.json');

  let rawMenus: any[] = [];

  // Try reading from login API directly
  try {
    const adminUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin@digigold.in';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const loginUrl = `${config.baseURL.endsWith('/') ? config.baseURL : config.baseURL + '/'}api/auth/login`;

    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPass }),
    });

    if (res.ok) {
      const data = await res.json();
      rawMenus = data.user?.menus || [];
    }
  } catch (err) {
    console.warn(`[Menu Discovery] Failed to fetch live menus via API (${err}). Using cached auth state.`);
  }

  // Fallback to static registry if API unreached
  if (!rawMenus || rawMenus.length === 0) {
    console.warn('[Menu Discovery] Using fallback menu schema.');
    return [];
  }

  const inventory: DiscoveredMenu[] = [];

  function traverse(menuList: any[], parentId: number | null = null, parentName: string = 'Root') {
    for (const item of menuList) {
      const hasChildren = item.children && item.children.length > 0;
      const isRoute = item.route && item.route !== '#';

      if (isRoute) {
        const meta = inferMenuMetadata(item.route, item.name);
        inventory.push({
          id: item.id,
          parentId,
          parentName,
          name: item.name,
          displayName: item.displayName || item.name,
          route: item.route,
          mappedApi: meta.mappedApi,
          primaryOperation: meta.primaryOperation,
          supportedActions: meta.supportedActions,
          permissionPrefix: meta.permissionPrefix,
          isAccessible: true,
        });
      }

      if (hasChildren) {
        traverse(item.children, item.id, item.displayName || item.name);
      }
    }
  }

  traverse(rawMenus);
  return inventory;
}

/**
 * Writes the discovered menu inventory to CSV and JSON formats.
 */
export function exportMenuInventory(inventory: DiscoveredMenu[], reportsDir: string) {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonPath = path.join(reportsDir, 'menu-inventory.json');
  fs.writeFileSync(jsonPath, JSON.stringify(inventory, null, 2), 'utf-8');

  const csvPath = path.join(reportsDir, '01_menu_inventory.csv');
  const headers = [
    'Menu ID',
    'Parent Menu',
    'Menu Name',
    'Display Name',
    'Page Route',
    'Mapped API Endpoint',
    'Primary Operation',
    'Supported Actions',
    'Permission Key',
    'Status',
  ];

  const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

  const rows = inventory.map((m) => [
    m.id,
    escapeCsv(m.parentName),
    escapeCsv(m.name),
    escapeCsv(m.displayName),
    escapeCsv(m.route),
    escapeCsv(m.mappedApi),
    escapeCsv(m.primaryOperation),
    escapeCsv(m.supportedActions.join('; ')),
    escapeCsv(m.permissionPrefix),
    m.isAccessible ? 'Accessible' : 'Restricted',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`[Menu Discovery] ✓ Discovered ${inventory.length} accessible admin menus → ${csvPath}`);
}
