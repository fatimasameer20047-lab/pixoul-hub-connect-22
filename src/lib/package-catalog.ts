export type PackageOption = {
  id: string;
  label: string;
  durationHours?: number;
  price: number;
  menuItemId: string;
};

export type PackageItem = {
  id: string;
  name: string;
  description?: string;
  options: PackageOption[];
};

export type PackageGroup = {
  id: string;
  title: string;
  subtitle: string;
  items: PackageItem[];
};

// Stable UUIDs to satisfy Supabase uuid column requirements and enable deduping in cart
const optionId = {
  training1h: '11111111-1111-4111-8111-111111111111',
  training4h: '11111111-1111-4111-8111-111111111114',
  training6h: '11111111-1111-4111-8111-111111111116',
  vip1h: '22222222-2222-4222-8222-222222222221',
  vip4h: '22222222-2222-4222-8222-222222222224',
  vip6h: '22222222-2222-4222-8222-222222222226',
  private1h: '33333333-3333-4333-8333-333333333331',
  private3h: '33333333-3333-4333-8333-333333333333',
  private5h: '33333333-3333-4333-8333-333333333335',
  social1: '44444444-4444-4444-8444-444444444441',
  social2: '44444444-4444-4444-8444-444444444442',
  social3: '44444444-4444-4444-8444-444444444443',
} as const;

export const packageGroups: PackageGroup[] = [
  {
    id: 'pc-gaming',
    title: 'PC Gaming',
    subtitle: 'Training, VIP, and Private rooms',
    items: [
      {
        id: 'training-room',
        name: 'Training Room',
        description: 'Flexible slots for practice sessions',
        options: [
          { id: 'training-1h', label: '1 Hour', durationHours: 1, price: 20, menuItemId: optionId.training1h },
          { id: 'training-4h', label: '4 Hours', durationHours: 4, price: 60, menuItemId: optionId.training4h },
          { id: 'training-6h', label: '6 Hours', durationHours: 6, price: 80, menuItemId: optionId.training6h },
        ],
      },
      {
        id: 'vip-rooms',
        name: 'VIP Rooms',
        description: 'Premium setups with concierge support',
        options: [
          { id: 'vip-1h', label: '1 Hour', durationHours: 1, price: 30, menuItemId: optionId.vip1h },
          { id: 'vip-4h', label: '4 Hours', durationHours: 4, price: 95, menuItemId: optionId.vip4h },
          { id: 'vip-6h', label: '6 Hours', durationHours: 6, price: 140, menuItemId: optionId.vip6h },
        ],
      },
      {
        id: 'private-rooms',
        name: 'Private Rooms',
        description: 'Dedicated rooms for small squads',
        options: [
          { id: 'private-1h', label: '1 Hour', durationHours: 1, price: 40, menuItemId: optionId.private1h },
          { id: 'private-3h', label: '3 Hours', durationHours: 3, price: 95, menuItemId: optionId.private3h },
          { id: 'private-5h', label: '5 Hours', durationHours: 5, price: 140, menuItemId: optionId.private5h },
        ],
      },
    ],
  },
  {
    id: 'social-gaming',
    title: 'Social Gaming Room',
    subtitle: 'Room + food bundles for your crew',
    items: [
      {
        id: 'social-package-1',
        name: 'Package 1',
        description: '1 hour in room + food for 5 pax',
        options: [{ id: 'social-1', label: '1 Hour', durationHours: 1, price: 300, menuItemId: optionId.social1 }],
      },
      {
        id: 'social-package-2',
        name: 'Package 2',
        description: '1 hour in room + food for 10 pax',
        options: [{ id: 'social-2', label: '1 Hour', durationHours: 1, price: 675, menuItemId: optionId.social2 }],
      },
      {
        id: 'social-package-3',
        name: 'Package 3',
        description: '1 hour in room + food for 15 pax',
        options: [{ id: 'social-3', label: '1 Hour', durationHours: 1, price: 1000, menuItemId: optionId.social3 }],
      },
    ],
  },
];

const packageOptionList = packageGroups.flatMap(group =>
  group.items.flatMap(item =>
    item.options.map(option => ({
      ...option,
      name: item.name,
      groupId: group.id,
      itemId: item.id,
    }))
  )
);

export const packageMenuItemIds = new Set(packageOptionList.map(option => option.menuItemId));

export const isPackageMenuItem = (menuItemId?: string | null) =>
  Boolean(menuItemId && packageMenuItemIds.has(menuItemId));

export const getPackageOptionByMenuItemId = (menuItemId: string) =>
  packageOptionList.find(option => option.menuItemId === menuItemId);
