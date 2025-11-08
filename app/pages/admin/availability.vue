<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <UInput v-model.number="weekRange.start" type="number" placeholder="Start Week" />
      <span>to</span>
      <UInput v-model.number="weekRange.end" type="number" placeholder="End Week" />
    </div>

    <div class="border border-gray-200 dark:border-gray-700 rounded-md bg-white isolate">
      <UTable
        v-model:column-pinning="columnPinning"
        sticky
        :columns="dynamicColumns"
        :data="flatRows"
        class="flex-1 max-h-[600px]"
      >
        <template #name-cell="{ row }">
          <div v-if="row.original?.kind === 'parent'" class="font-bold">
            {{ row.original?.name }}
          </div>
          <div v-else class="pl-4 text-sm text-gray-700 dark:text-gray-200">
            {{ row.original?.label }}
          </div>
        </template>

        <template v-for="col in weekColumns" :key="col.id" #[`${col.id}-cell`]="{ row }">
          <UInput
            v-if="row.original?.kind === 'child'"
            :key="row.id + '-' + col.id"
            v-model.number="(row.original as FlatChildRow).data[col.id as WeekKey]"
            type="text"
            size="md"
            class="w-8 text-center relative z-0"
            @update:model-value="() => onCellInput(row.original as FlatChildRow, col.id as WeekKey)"
            @blur="() => onCellBlur(row.original as FlatChildRow, col.id as WeekKey)"
          />
          <span v-else>&nbsp;</span>
        </template>
      </UTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

definePageMeta({ middleware: 'admin' });

// --- Data Model ---

// 1. CAPACITY DATA (Hierarchical)
// UTable will look for the 'children' key automatically.
type SlotType = 'evening' | 'morning' | 'daytime' | 'flex';
type WeekKey = `week${number}`;
type CellMap = Record<WeekKey, number>;
interface AvailabilityChild { id: string; type: SlotType; data: CellMap }
interface UserRow { id: string; name: string; children: AvailabilityChild[] }

interface ApiAvailabilityCompact { week: number; morning_days: number; daytime_days: number; nighttime_days: number; flex_days: number }
interface ApiUserAvailability { id: number; name: string; availability: ApiAvailabilityCompact[] }
interface ApiAvailabilityListResponse { users: ApiUserAvailability[] }

const users = ref<UserRow[]>([]);
const savingTimers = new Map<string, number>();

// --- Column and Table Configuration ---

// 2. DYNAMIC COLUMNS
const weekRange = ref({ start: 14, end: 40 });

// This computed prop generates the column definitions for the week columns
const weekColumns = computed<{ id: WeekKey; header: string }[]>(() => {
  if (weekRange.value.start > weekRange.value.end) return [];

  return Array.from({ length: weekRange.value.end - weekRange.value.start + 1 }, (_, i) => {
    const weekNr = weekRange.value.start + i;
    return {
      id: `week${weekNr}`,
      header: `Wk ${weekNr}`
    };
  });
});

// --- Data loading ---
async function fetchAvailability() {
  const { $api } = useNuxtApp();
  console.debug('[availability] fetchAvailability start', weekRange.value);
  let payload: ApiAvailabilityListResponse | null = null;
  try {
    payload = await $api<ApiAvailabilityListResponse>('/admin/availability', {
      method: 'GET',
      query: { week_start: weekRange.value.start, week_end: weekRange.value.end }
    });
  } catch {
    console.debug('[availability] fetchAvailability failed');
    payload = null;
  }
  const nextUsers: UserRow[] = [];
  for (const u of payload?.users ?? []) {
    const childRows: [AvailabilityChild, AvailabilityChild, AvailabilityChild, AvailabilityChild] = [
      { id: `${u.id}-night`, type: 'evening', data: {} as CellMap },
      { id: `${u.id}-morn`, type: 'morning', data: {} as CellMap },
      { id: `${u.id}-day`, type: 'daytime', data: {} as CellMap },
      { id: `${u.id}-flex`, type: 'flex', data: {} as CellMap }
    ];
    for (const wk of u.availability ?? []) {
      const key = `week${wk.week}` as WeekKey;
      childRows[0].data[key] = wk.nighttime_days ?? 0;
      childRows[1].data[key] = wk.morning_days ?? 0;
      childRows[2].data[key] = wk.daytime_days ?? 0;
      childRows[3].data[key] = wk.flex_days ?? 0;
    }
    nextUsers.push({ id: String(u.id), name: u.name, children: childRows });
  }
  users.value = nextUsers;
  console.debug('[availability] fetchAvailability done, users:', nextUsers.length);
}

watch(
  () => [weekRange.value.start, weekRange.value.end],
  () => {
    fetchAvailability();
  }
);

onMounted(fetchAvailability);

function clamp07(n: unknown) {
  const v = Number.parseInt(String(n ?? '0'), 10);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(7, v));
}

function scheduleSave(row: FlatChildRow, colId: WeekKey) {
  const week = Number(colId.replace('week', ''));
  const key = `${row.userId}:${week}:${row.slot}`;
  // debounce 400ms
  if (savingTimers.has(key)) window.clearTimeout(savingTimers.get(key));
  const handle = window.setTimeout(async () => {
    savingTimers.delete(key);
    const slot = row.slot === 'evening' ? 'nighttime' : row.slot; // map to API slot (daytime maps directly)
    const value = clamp07(row.data[colId]);
    row.data[colId] = value; // ensure clamped in UI
    const { $api } = useNuxtApp();
    try {
      await $api(`/admin/availability/${row.userId}/${week}`, {
        method: 'PATCH',
        body: { slot, value }
      });
    } catch {
      console.debug('[availability] scheduleSave failed');
    }
  }, 400);
  savingTimers.set(key, handle);
}

type FlatChildRow = { kind: 'child'; data: CellMap; userId: string; slot: SlotType };

function onCellInput(row: FlatChildRow, colId: WeekKey) {
  // Keep value clamped as user types
  const v = clamp07(row.data[colId]);
  row.data[colId] = v;
  scheduleSave(row, colId);
}

function onCellBlur(row: FlatChildRow, colId: WeekKey) {
  scheduleSave(row, colId);
}


// Build flat rows: a parent display row and four child rows per user
const flatRows = computed(() => {
  const labelMap = {
    evening: 'Avond',
    morning: 'Ochtend',
    daytime: 'Dag',
    flex: 'Flex'
  };

  const rows = [];
  for (const u of users.value) {
    rows.push({ id: `${u.id}-parent`, kind: 'parent', name: u.name });
    for (const child of u.children ?? []) {
      rows.push({
        id: child.id,
        kind: 'child',
        label: labelMap[child.type] ?? child.type,
        data: child.data,
        userId: u.id,
        slot: child.type
      });
    }
  }
  return rows;
});

// This computed prop combines the static 'name' column with the dynamic week columns
const dynamicColumns = computed(() => [
  {
    id: 'name',
    header: 'User / Type'
  },
  ...weekColumns.value
]);

// 3. STICKY / EXPANDED STATE
// Pin the 'name' column to the left
const columnPinning = ref({ left: ['name'] });

// Get all parent row IDs to expand them by default

// 4. UI CONFIG REMOVED (Nuxt UI Table `ui` prop incompatible with provided shape)
</script>

<style scoped>
/* Hide number input spinners (Chrome, Safari, Edge) */
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* Firefox */
.no-spinner[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
