<template>
  <div>
    <UPageHeader :title="isArchiveMode ? 'Archief (Read-only)' : 'Alle bezoeken'" />

    <div v-if="isArchiveMode" class="mt-4 p-4 bg-amber-50 text-amber-800 rounded mb-4 text-sm flex items-center gap-2">
      <UIcon name="i-lucide-info" class="size-5" />
      Dit is het archief. Onderstaande bezoeken zijn gearchiveerde projecten. Je kunt deze bezoeken niet meer bewerken.
    </div>

    <div class="mt-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2 flex-1">
        <UInput
          v-model="search"
          placeholder="Zoek op project, locatie, functies, soorten, onderzoekers"
          class="w-64"
        />
        <USelectMenu
          v-model="selectedStatuses"
          :items="statusOptions"
          multiple
          placeholder="Status"
          class="w-56"
        />

        <UInput
          v-model="filterClusterNumber"
          placeholder="Cluster"
          class="w-20"
        />

        <UInputMenu
          :model-value="selectedFunctionFilters"
          :items="functionOptions"
          multiple
          searchable
          placeholder="Functies"
          class="w-64"
          @update:model-value="(sel) => (filterFunctionIds = sel.map((o) => o.value as number))"
        />

        <UInputMenu
          :model-value="selectedSpeciesFilters"
          :items="speciesOptions"
          multiple
          searchable
          :filter-fields="['label', 'abbreviation']"
          placeholder="Soorten"
          class="w-64"
          @update:model-value="(sel) => (filterSpeciesIds = sel.map((o) => o.value as number))"
        />
      </div>

      <div v-if="!isArchiveMode" class="flex items-center gap-2">
        <UDropdownMenu :items="actionItems" :content="{ side: 'bottom', align: 'end' }">
          <UButton
            color="neutral"
            variant="outline"
            label="Acties"
            trailing-icon="i-heroicons-chevron-down-20-solid"
          />
        </UDropdownMenu>
      </div>
      <div v-else>
        <UButton
          color="neutral"
          variant="outline"
          label="Export CSV"
          icon="i-lucide-download"
          @click="onExportCsv"
        />
      </div>
    </div>

    <UCard v-if="isAdmin && showCreate && !isArchiveMode" class="mt-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs mb-1">Project</label>
             <USelectMenu
                v-model="selectedProject"
                :items="projectOptions"
                searchable
                searchable-placeholder="Zoek projectcode"
                placeholder="Project"
                class="flex-1 w-2xs"
                @update:model-value="onProjectChange"

             />

          <p v-if="selectedProjectDetails" class="mt-1 text-xs text-gray-500">
            {{ selectedProjectDetails.location }}
          </p>
        </div>
        <div>
          <label class="block text-xs mb-1">Cluster</label>
          <USelectMenu
            v-model="selectedCluster"
            :items="clusterOptions"
            placeholder="Cluster"
            :disabled="!selectedProject"
          />
          <p v-if="selectedClusterDetails" class="mt-1 text-xs text-gray-500">
            {{ selectedClusterDetails.address }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs mb-1">Functies</label>
          <UInput
             v-if="createCustomVisit"
             v-model="createCustomFunctionName"
             placeholder="Voer functie in"
          />
          <UInputMenu
            v-else
            :model-value="createFunctions"
            :items="functionOptions"
            multiple
            class="w-2xs"
            @update:model-value="(sel) => (createFunctionIds = sel.map((o) => o.value as number))"
          />
        </div>
        <div>
          <label class="block text-xs mb-1">Soorten</label>
          <UInput
             v-if="createCustomVisit"
             v-model="createCustomSpeciesName"
             placeholder="Voer soort in"
          />
          <UInputMenu
            v-else
            :model-value="createSpecies"
            :items="speciesOptions"
            multiple
            :filter-fields="['label', 'abbreviation']"
            class="w-3xs"
            @update:model-value="(sel) => (createSpeciesIds = sel.map((o) => o.value as number))"
          />
           <div class="mt-1">
             <UCheckbox v-model="createCustomVisit" label="Andere soort" class="text-xs" />
          </div>
        </div>

        <div>
          <label class="block text-xs mb-1">Van</label>
          <UInput v-model="createFromDate" type="date" />
        </div>
        <div>
          <label class="block text-xs mb-1">Tot</label>
          <UInput v-model="createToDate" type="date" />
        </div>

        <div>
          <label class="block text-xs mb-1">Voorlopige week</label>
          <UInput v-model.number="createProvisionalWeek" type="number" min="1" max="53" />
          <div class="mt-1">
            <UTooltip text="Seizoensplanning behoudt deze week (tenzij leeg).">
            <UCheckbox
              v-model="createProvisionalLocked"
              label="Voorlopige week vastzetten"
              class="text-xs"
            /> <UIcon name="i-lucide-info" class="size-4" />
            </UTooltip>
          </div>
        </div>

        <div>
          <label class="block text-xs mb-1">{{ featureDailyPlanning ? 'Geplande datum' : 'Gepland voor week' }}</label>
          <UInput v-if="featureDailyPlanning" v-model="createPlannedDate" type="date" />
          <UInput v-else v-model.number="createPlannedWeek" type="number" min="1" max="53" />
          <div class="mt-1">
            <UCheckbox v-model="createPlanningLocked" label="Planning vastzetten" class="text-xs" />
          </div>
        </div>

        <div>
          <label class="block text-xs mb-1">Onderzoekers</label>
          <UInputMenu
            :model-value="createResearchers"
            :items="researcherOptions"
            multiple
            class="w-3xs"
            @update:model-value="(sel) => (createResearcherIds = sel.map((o) => o.value as number))"
          />
        </div>

        <div>
          <label class="block text-xs mb-1">Aantal onderzoekers</label>
          <UInput v-model.number="createRequiredResearchers" type="number" />
        </div>

        <div>
          <label class="block text-xs mb-1">Bezoek nr</label>
          <UInput v-model.number="createVisitNr" type="number" />
        </div>

        <div>
          <label class="block text-xs mb-1">Starttijd</label>
          <UInput v-model="createStartTimeText" />
        </div>

        <div>
          <label class="block text-xs mb-1">Dagdeel</label>
          <USelectMenu
            :model-value="partOfDayOptions.find((o) => o.value === createPartOfDay)"
            :items="partOfDayOptions"
            placeholder="Kies dagdeel"
            class="w-3xs"
            @update:model-value="(opt) => (createPartOfDay = opt?.value ?? null)"
          />
        </div>
        <div>
          <label class="block text-xs mb-1">Duur (uur)</label>
          <UInput v-model.number="createDurationHours" type="number" step="0.5" />
        </div>

        <div>
          <label class="block text-xs mb-1">Min temp (°C)</label>
          <UInput v-model.number="createMinTemperature" type="number" />
        </div>
        <div>
          <label class="block text-xs mb-1">Max wind (Bft)</label>
          <UInput v-model.number="createMaxWind" type="number" />
        </div>
        <div>
          <label class="block text-xs mb-1">Max neerslag</label>
          <UInput v-model="createMaxPrecipitation" />
        </div>
        <div v-if="showCreateExpertise">
          <label class="block text-xs mb-1">Vleermuis ervaring</label>
          <USelectMenu
            :model-value="selectedExperienceOption(createExpertiseLevel)"
            :items="experienceLevelOptionsArr"
            placeholder="Kies niveau"
            @update:model-value="(opt) => (createExpertiseLevel = opt?.value ?? null)"
          />
        </div>

        <div class="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-3">
          <UCheckbox v-model="createWbc" label="WBC" />
          <UCheckbox v-model="createFiets" label="Fiets" />
          <UCheckbox v-model="createVog" label="VOG" />
          <UCheckbox v-model="createHub" label="HUB" />
          <UCheckbox v-model="createDvp" label="DVP" />
          <UCheckbox v-model="createSleutel" label="Sleutel" />
          <UCheckbox v-model="createPriority" label="Prioriteit" />
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs mb-1">Opmerkingen planning</label>
          <UTextarea v-model="createRemarksPlanning" class="w-xl" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs mb-1">Opmerkingen veld</label>
          <UTextarea v-model="createRemarksField" class="w-xl" />
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <UButton color="neutral" variant="soft" @click="onCancelCreate">Annuleren</UButton>
        <UButton :loading="creating" @click="onCreateVisit">Opslaan</UButton>
      </div>
    </UCard>

    <UCard class="mt-6">
      <div v-if="rows.length === 0 && !loading" class="p-4 text-sm text-gray-500">
        Geen bezoeken om te tonen.
      </div>

      <div v-else class="flex flex-col gap-4">
        <UTable
          :key="tableKey"
          :data="rows"
          :columns="columns"
          :loading="loading"
          :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
          class="flex-1"
        >
          <template v-if="!isArchiveMode" #select-cell="{ row }">
            <UCheckbox
              :model-value="bulkSelectedIds.has(row.original.id)"
              @click.stop
              @update:model-value="toggleBulkSelection(row.original.id, $event as boolean)"
            />
          </template>

          <template #status-cell="{ row }">
            <UBadge
              :label="statusLabel(row.original.status)"
              variant="subtle"
              color="neutral"
              class="text-gray-600 dark:text-gray-200"
            />
          </template>

          <template #week-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-300">
              {{ row.original.planned_week ?? row.original.provisional_week ?? '-' }}
            </span>
          </template>

          <template #visit_code-cell="{ row }">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
              {{ row.original.visit_code || '-' }}
            </span>
          </template>

          <template #functions-cell="{ row }">
            <span
              class="text-xs text-gray-700 dark:text-gray-300 max-w-xs whitespace-normal break-words block"
            >
              {{
                 row.original.functions.length
                 ? row.original.functions.map((f) => f.name).join(', ')
                 : (row.original.custom_function_name || '-')
              }}
            </span>
          </template>

          <template #species-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-300">
              {{
                 row.original.species.length
                 ? row.original.species.map((s) => s.abbreviation || s.name).join(', ')
                 : (row.original.custom_species_name || '-')
              }}
            </span>
          </template>

          <template #period-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-300">
              {{ formatDate(row.original.from_date) }} – {{ formatDate(row.original.to_date) }}
            </span>
          </template>

          <template #researchers-cell="{ row }">
            <span class="text-xs text-gray-700 dark:text-gray-300">
              {{
                row.original.researchers.length > 0
                  ? row.original.researchers.map((r) => r.full_name || `Gebruiker #${r.id}`).join(', ')
                  : (row.original.required_researchers ?? '-')
              }}
            </span>
          </template>

          <template #expand-cell="{ row }">
            <UButton
              variant="outline"
              color="neutral"
              size="xs"
              :icon="row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus'"
              @click.stop="row.toggleExpanded()"
            />
          </template>

          <template #expanded="{ row }">
            <div>
              <div v-if="!isAdmin || isArchiveMode" class="px-3 pb-3 text-sm space-y-2">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span class="font-medium">Duur:</span>
                    {{ durationHours(row.original.duration) ?? '-' }} uur
                  </div>
                  <div>
                    <UBadge
                      v-if="row.original.wbc"
                      class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                      >WBC</UBadge
                    >
                    <UBadge
                      v-if="row.original.fiets"
                      class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                      >Fiets</UBadge
                    >
                    <UBadge
                      v-if="row.original.hub"
                      class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                      >HUB</UBadge
                    >
                    <UBadge
                      v-if="row.original.dvp"
                      class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                      >DVP</UBadge
                    >
                    <UBadge
                      v-if="row.original.sleutel"
                      class="px-2 mx-1 py-0.5 rounded-full bg-gray-200"
                      >Sleutel</UBadge
                    >
                    <UBadge
                      v-if="row.original.priority"
                      class="px-2 mx-1 py-0.5 rounded-full bg-amber-200"
                      >Prioriteit</UBadge
                    >
                  </div>
                  <div>
                    <span class="font-medium">Weercondities:</span>
                    Min {{ row.original.min_temperature_celsius ?? '-' }} °C, max wind
                    {{ row.original.max_wind_force_bft ?? '-' }}, max neerslag
                    {{ row.original.max_precipitation || '-' }}
                  </div>
                  <div>
                    <span class="font-medium">Starttijd:</span>
                    {{ row.original.start_time_text || '-' }}
                  </div>
                  <div>
                    <span class="font-medium">Adres:</span>
                    {{ row.original.cluster_address }}
                  </div>
                  <div v-if="row.original.project_customer">
                    <span class="font-medium">Klant:</span>
                    {{ row.original.project_customer }}
                  </div>
                  <div v-if="plannedWeekLabel(row.original)">
                    <span class="font-medium">Week:</span>
                    {{ plannedWeekLabel(row.original) }}
                  </div>
                  <div>
                    <span class="font-medium">Onderzoekers: </span>
                    <span v-if="row.original.researchers.length > 0">
                      {{
                        row.original.researchers
                          .map((r) => r.full_name || `Gebruiker #${r.id}`)
                          .join(', ')
                      }}
                    </span>
                    <span v-else>
                      {{ row.original.required_researchers ?? '-' }}
                    </span>
                  </div>

                  <div v-if="row.original.project_google_drive_folder" class="my-4">
                    <a
                      :href="row.original.project_google_drive_folder"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-primary-600 underline"
                    >
                      Project folder
                    </a>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div class="font-medium mb-1">Opmerkingen planning</div>
                    <p class="text-xs whitespace-pre-line">
                      {{ row.original.remarks_planning || 'Geen opmerkingen' }}
                    </p>
                  </div>
                  <div>
                    <div class="font-medium mb-1">Opmerkingen veld</div>
                    <p class="text-xs whitespace-pre-line">
                      {{ row.original.remarks_field || 'Geen opmerkingen' }}
                    </p>
                  </div>
                </div>

                <VisitActivityLog :visit-id="row.original.id" />
              </div>

              <div v-else class="px-3 pb-3">
                <div class="text-xs mb-2 text-gray-500">
                  Project {{ row.original.project_code }} · Cluster
                  {{ row.original.cluster_number }} ·
                  {{ row.original.cluster_address }}
                  <span v-if="row.original.project_customer"> · Klant: {{ row.original.project_customer }}</span>
                </div>

                <div v-if="row.original.project_google_drive_folder" class="my-4">
                  <a
                    :href="row.original.project_google_drive_folder"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-primary-600 underline"
                  >
                    Project folder
                  </a>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div class="flex justify-between items-center mb-1">
                      <label class="block text-xs">Functies</label>
                    </div>
                    <UInput
                      v-if="row.original.custom_function_name !== null"
                      v-model="row.original.custom_function_name"
                      placeholder="Maatwerk functie"
                    />
                    <UInputMenu
                      v-else
                      :model-value="mapIdsToOptions(row.original.function_ids, functionOptions)"
                      :items="functionOptions"
                      multiple
                      class="w-2xs"
                      @update:model-value="
                        (sel) => (row.original.function_ids = sel.map((o) => o.value as number))
                      "
                    />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Soorten</label>
                    <UInput
                      v-if="row.original.custom_species_name !== null"
                      v-model="row.original.custom_species_name"
                      placeholder="Maatwerk soort"
                    />
                    <UInputMenu
                      v-else
                      :model-value="mapIdsToOptions(row.original.species_ids, speciesOptions)"
                      :items="speciesOptions"
                      multiple
                      :filter-fields="['label', 'abbreviation']"
                      class="w-3xs"
                      @update:model-value="
                        (sel) => (row.original.species_ids = sel.map((o) => o.value as number))
                      "
                    />
                     <div class="mt-1">
                         <UCheckbox
                            :model-value="!!(row.original.custom_function_name || row.original.custom_species_name)"
                            label="Andere soort"
                            class="text-xs"
                            @change="(val) => {
                                if (val) {
                                   row.original.custom_function_name = ''
                                   row.original.custom_species_name = ''
                                   row.original.function_ids = []
                                   row.original.species_ids = []
                                } else {
                                   row.original.custom_function_name = null
                                   row.original.custom_species_name = null
                                }
                            }"
                         />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Van</label>
                    <UInput v-model="row.original.from_date" type="date" />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Tot</label>
                    <UInput v-model="row.original.to_date" type="date" />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Voorlopige week</label>
                    <UInput
                      v-model.number="row.original.provisional_week"
                      type="number"
                      min="1"
                      max="53"
                    />
                    <div class="mt-1">
                      <UTooltip text="Seizoensplanning behoudt deze week (tenzij leeg)">
                      <UCheckbox
                        v-model="row.original.provisional_locked"
                        label="Voorlopige week vastzetten"
                        class="text-xs"
                      />
                      </UTooltip>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs mb-1">{{ featureDailyPlanning ? 'Geplande datum' : 'Gepland voor week' }}</label>
                    <UInput v-if="featureDailyPlanning" v-model="row.original.planned_date" type="date" />
                    <UInput
                      v-else
                      v-model.number="row.original.planned_week"
                      type="number"
                      min="1"
                      max="53"
                    />
                    <div class="mt-1">
                      <UCheckbox
                        v-model="row.original.planning_locked"
                        label="Planning vastzetten"
                        class="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Onderzoekers</label>
                    <UInputMenu
                      :model-value="
                        mapIdsToOptions(row.original.researcher_ids ?? [], researcherOptions)
                      "
                      :items="researcherOptions"
                      multiple
                      class="w-3xs"
                      @update:model-value="
                        (sel) => {
                          const ids = sel.map((o) => o.value).filter((v): v is number => v !== null)
                          row.original.researcher_ids = ids
                          row.original.researchers = ids.map((id) => {
                            const opt = researcherOptions.find((o) => o.value === id)
                            return { id, full_name: opt?.label ?? null }
                          })
                        }
                      "
                    />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Aantal onderzoekers</label>
                    <UInput v-model.number="row.original.required_researchers" type="number" />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Bezoek nr</label>
                    <UInput v-model.number="row.original.visit_nr" type="number" />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Starttijd</label>
                    <UInput v-model="row.original.start_time_text" />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Dagdeel</label>
                    <USelectMenu
                      :model-value="
                        row.original.part_of_day === null
                          ? undefined
                          : partOfDayOptions.find((o) => o.value === row.original.part_of_day)
                      "
                      :items="partOfDayOptions"
                      placeholder="Kies dagdeel"
                      class="w-3xs"
                      @update:model-value="(opt) => (row.original.part_of_day = opt?.value ?? null)"

                    />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Duur (uur)</label>
                    <UInput
                      :model-value="durationHours(row.original.duration)"
                      type="number"
                      step="0.5"
                      @update:model-value="
                        (h: number | null) =>
                          (row.original.duration = h == null ? null : Math.round(h * 60))
                      "
                    />
                  </div>

                  <div>
                    <label class="block text-xs mb-1">Min temp (°C)</label>
                    <UInput v-model.number="row.original.min_temperature_celsius" type="number" />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Max wind (Bft)</label>
                    <UInput v-model.number="row.original.max_wind_force_bft" type="number" />
                  </div>
                  <div>
                    <label class="block text-xs mb-1">Max neerslag</label>
                    <UInput v-model="row.original.max_precipitation" />
                  </div>
                  <div v-if="showRowExpertise(row.original)">
                    <label class="block text-xs mb-1">Vleermuis ervaring</label>
                    <USelectMenu
                      :model-value="selectedExperienceOption(row.original.expertise_level)"
                      :items="experienceLevelOptionsArr"
                      placeholder="Kies niveau"
                      @update:model-value="
                        (opt) => (row.original.expertise_level = opt?.value ?? null)
                      "
                    />
                  </div>

                  <div class="col-span-1 md:col-span-2">
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <UCheckbox v-model="row.original.wbc" label="WBC" />
                      <UCheckbox v-model="row.original.fiets" label="Fiets" />
                      <UCheckbox v-model="row.original.vog" label="VOG" />
                      <UCheckbox v-model="row.original.hub" label="HUB" />
                      <UCheckbox v-model="row.original.dvp" label="DVP" />
                      <UCheckbox v-model="row.original.sleutel" label="Sleutel" />
                      <UCheckbox v-model="row.original.priority" label="Prioriteit" />
                    </div>
                  </div>

                  <div class="md:col-span-2">
                    <label class="block text-xs mb-1">Opmerkingen planning</label>
                    <UTextarea v-model="row.original.remarks_planning" class="w-xl" />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-xs mb-1">Opmerkingen veld</label>
                    <UTextarea v-model="row.original.remarks_field" class="w-xl" />
                  </div>
                </div>
                <div v-if="!isArchiveMode" class="my-4 flex gap-2">
                  <UButton
                    size="xs"
                    variant="soft"
                    icon="i-heroicons-eye"
                    :to="{ path: `/visits/${row.original.id}`, query: { back: 'visits' } }"
                  >
                    Details
                  </UButton>
                  <UButton
                    size="xs"
                    variant="soft"
                    icon="i-lucide-calendar-clock"
                    @click="onOpenAdminPlanning(row.original)"
                  >
                    {{ statusLabel(row.original.status) }} aanpassen
                  </UButton>
                  <UButton
                    size="xs"
                    variant="soft"
                    icon="i-lucide-copy"
                    :loading="duplicatingId === row.original.id"
                    @click="onDuplicateVisit(row.original)"
                  >
                    Dupliceer
                  </UButton>
                  <UButton
                    color="error"
                    variant="soft"
                    size="xs"
                    icon="i-heroicons-trash"
                    @click="openDeleteModal(row.original)"
                  >
                    Verwijder
                  </UButton>

                  <UButton
                    size="xs"
                    color="primary"
                    :loading="savingId === row.original.id"
                    @click="onSaveVisit(row.original)"
                  >
                    Opslaan
                  </UButton>
                </div>
                <VisitActivityLog :visit-id="row.original.id" />
              </div>
            </div>
          </template>
        </UTable>

        <div class="flex items-center justify-between mt-2">
          <div class="text-xs text-gray-500">Pagina {{ page }} · {{ total }} bezoeken</div>
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="ghost" :disabled="page <= 1 || loading" @click="onPrevPage">
              Vorige
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              :disabled="page >= maxPage || loading"
              @click="onNextPage"
            >
              Volgende
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <VisitStatusModal
      v-if="selectedVisitForStatus && isAdmin"
      v-model:open="statusModalOpen"
      :visits="[selectedVisitForStatus]"
      :is-admin="isAdmin"
      :researcher-options="researcherOptions"
      @saved="loadVisits"
    />

    <!-- Bulk Status Modal -->
    <VisitStatusModal
      v-if="isAdmin"
      :visits="bulkSelectedVisitsData"
      :open="bulkStatusModalOpen"
      :is-admin="true"
      :researcher-options="researcherOptions"
      @update:open="bulkStatusModalOpen = $event"
      @saved="onBulkSaved"
    />

    <!-- Floating Action Bar for Bulk Selection -->
    <Teleport v-if="!isArchiveMode" to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-full opacity-0"
      >
        <div
          v-if="bulkSelectedIds.size > 0"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-2.5"
        >
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
            {{ bulkSelectedIds.size }} bezoek(en) geselecteerd
          </span>
          <UButton size="sm" icon="i-lucide-shield-check" @click="bulkStatusModalOpen = true">
            Status aanpassen
          </UButton>
          <UButton size="sm" variant="ghost" color="neutral" @click="bulkSelectedIds.clear()">
            Deselecteer
          </UButton>
        </div>
      </Transition>
    </Teleport>

    <UModal v-model:open="deleteModalOpen" title="Bezoek verwijderen">
      <template #content>
        <UCard>
          <div>Weet je zeker dat je dit bezoek wilt verwijderen?</div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">
                Annuleer
              </UButton>
              <UButton
                color="error"
                :loading="isDeleting"
                @click="confirmDeleteVisit"
              >
                Verwijder
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import type { TableColumn } from '#ui/types'
  import { storeToRefs } from 'pinia'
  import { useAuthStore } from '~~/stores/auth'
  import { useTestModeStore } from '~~/stores/testMode'
  import { useRoute } from 'vue-router'
  import { validateIsoWeekWithinDateWindow } from '../../utils/visitWeekWindow'

  const route = useRoute()
  const isArchiveMode = computed(() => route.query.archive === '1')

  type VisitStatusCode =
    | 'created'
    | 'open'
    | 'planned'
    | 'overdue'
    | 'executed'
    | 'executed_with_deviation'
    | 'not_executed'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'missed'

  type CompactFunction = { id: number; name: string }
  type CompactSpecies = {
    id: number
    name: string
    abbreviation?: string | null
    family_name?: string | null
  }
  type UserName = { id: number; full_name: string | null }

  type VisitListRow = {
    id: number
    project_code: string
    project_location: string
    project_customer: string | null
    project_google_drive_folder: string | null
    cluster_id: number
    cluster_number: string
    cluster_address: string
    status: VisitStatusCode
    function_ids: number[]
    species_ids: number[]
    functions: CompactFunction[]
    species: CompactSpecies[]
    required_researchers: number | null
    visit_nr: number | null
    planned_week: number | null
    planned_date: string | null
    provisional_week: number | null
    provisional_locked: boolean
    from_date: string | null
    to_date: string | null
    duration: number | null
    min_temperature_celsius: number | null
    max_wind_force_bft: number | null
    max_precipitation: string | null
    expertise_level: string | null
    wbc: boolean
    fiets: boolean
    vog: boolean
    hub: boolean
    dvp: boolean
    sleutel: boolean
    remarks_planning: string | null
    remarks_field: string | null
    priority: boolean
    part_of_day: string | null
    start_time_text: string | null
    planning_locked: boolean
    researchers: UserName[]
    researcher_ids?: number[]
    advertized: boolean
    quote: boolean
    custom_function_name: string | null
    custom_species_name: string | null
    visit_code: string | null
  }

  type Option = { label: string; value: number | null; abbreviation?: string | null }
  type StringOption = { label: string; value: string | null }

  type ProjectOption = Option
  type ClusterOption = Option & { address?: string }

  type VisitListResponse = {
    items: VisitListRow[]
    total: number
    page: number
    page_size: number
  }

  const { $api } = useNuxtApp()
  const toast = useToast()

  const auth = useAuthStore()
  const { isAdmin } = storeToRefs(auth)

  const testModeStore = useTestModeStore()
  const { simulatedDate } = storeToRefs(testModeStore)

  const runtimeConfig = useRuntimeConfig()

  const testModeEnabled = computed<boolean>(() => {
    const raw = runtimeConfig.public.testModeEnabled
    if (typeof raw === 'string') {
      return raw === 'true' || raw === '1'
    }
    return Boolean(raw)
  })

  const featureDailyPlanning = computed<boolean>(() => {
    const raw = runtimeConfig.public.featureDailyPlanning
    if (typeof raw === 'string') {
      return raw === 'true' || raw === '1'
    }
    return Boolean(raw)
  })

  const enableVisitCode = computed<boolean>(() => {
    const raw = (runtimeConfig.public as Record<string, unknown>).enableVisitCode
    if (typeof raw === 'string') return raw === 'true' || raw === '1'
    return Boolean(raw)
  })

  const rows = ref<VisitListRow[]>([])
  const loading = ref(false)
  const page = ref(1)
  const pageSize = ref(50)
  const total = ref(0)
  const tableKey = ref(0)

  const search = ref('')

  const filterClusterNumber = ref('')
  const filterFunctionIds = ref<number[]>([])
  const filterSpeciesIds = ref<number[]>([])

  const statusModalOpen = ref(false)
  const selectedVisitForStatus = ref<VisitListRow | null>(null)

  // --- Bulk Selection ---
  const bulkSelectedIds = reactive(new Set<number>())
  const bulkStatusModalOpen = ref(false)

  function toggleBulkSelection(id: number, selected: boolean) {
    if (selected) {
      bulkSelectedIds.add(id)
    } else {
      bulkSelectedIds.delete(id)
    }
  }

  const bulkSelectedVisitsData = computed(() => {
    return rows.value
      .filter((v) => bulkSelectedIds.has(v.id))
      .map((v) => ({
        id: v.id,
        status: v.status,
        from_date: v.from_date,
        to_date: v.to_date,
        planned_week: v.planned_week,
        planned_date: v.planned_date,
        researchers: v.researchers
      }))
  })

  async function onBulkSaved() {
    bulkSelectedIds.clear()
    await loadVisits()
  }

  type VisitStatusOption = { label: string; value: VisitStatusCode }

  const selectedStatuses = ref<VisitStatusOption[]>([])

  const selectedFunctionFilters = computed(() =>
    mapIdsToOptions(filterFunctionIds.value, functionOptions.value)
  )
  const selectedSpeciesFilters = computed(() =>
    mapIdsToOptions(filterSpeciesIds.value, speciesOptions.value)
  )

  const statusOptions: VisitStatusOption[] = [
    { label: 'Aangemaakt', value: 'created' },
    { label: 'Open', value: 'open' },
    { label: 'Gepland', value: 'planned' },
    { label: 'Verlopen', value: 'overdue' },
    { label: 'Gemist', value: 'missed' },
    { label: 'Uitgevoerd', value: 'executed' },
    { label: 'Uitgevoerd (afwijking)', value: 'executed_with_deviation' },
    { label: 'Niet uitgevoerd', value: 'not_executed' },
    { label: 'Goedgekeurd', value: 'approved' },
    { label: 'Afgekeurd', value: 'rejected' },
    { label: 'Geannuleerd', value: 'cancelled' }
  ] satisfies { label: string; value: VisitStatusCode }[]

  const columns = computed<TableColumn<VisitListRow>[]>(() => {
    const cols: TableColumn<VisitListRow>[] = [
      { id: 'expand', header: '', enableSorting: false, cell: 'expand' },
    ]
    if (isAdmin.value && !isArchiveMode.value) {
      cols.push({ id: 'select', header: '', enableSorting: false })
    }
    cols.push(
      // { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'project_code', header: 'Projectcode' },
      { accessorKey: 'project_location', header: 'Locatie' },
      { accessorKey: 'cluster_number', header: 'Cluster' }
    )

    if (!enableVisitCode.value) {
      cols.push({ accessorKey: 'visit_nr', header: 'Bezoek nr' })
    }

    cols.push({ id: 'status', header: 'Status' })

    if (featureDailyPlanning.value) {
      cols.push({
        id: 'date',
        header: 'Datum',
        accessorKey: 'planned_date',
        cell: ({ row }) => {
          if (row.original.planned_date) {
            return formatDate(row.original.planned_date)
          }
          if (row.original.provisional_week) {
            return `W${row.original.provisional_week}`
          }
          return '-'
        }
      })
    } else {
      cols.push({ id: 'week', header: 'Week' })
    }

    if (enableVisitCode.value) {
      cols.push({ id: 'visit_code', header: 'Bezoekcode' })
    } else {
      cols.push(
        { id: 'functions', header: 'Functies' },
        { id: 'species', header: 'Soorten' }
      )
    }

    cols.push(
      { id: 'period', header: 'Periode' },
      { accessorKey: 'part_of_day', header: 'Dagdeel' },
      { id: 'researchers', header: 'Onderzoekers' }
    )
    return cols
  })

  const maxPage = computed(() => {
    if (total.value === 0) return 1
    return Math.max(1, Math.ceil(total.value / pageSize.value))
  })

  function statusLabel(code: VisitStatusCode): string {
    const found = statusOptions.find((s) => s.value === code)
    return found?.label ?? code
  }

  function formatDate(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: 'short' }).format(dt)
  }

  function durationHours(minutes: number | null | undefined): number | null {
    if (minutes == null) return null
    return Math.round((minutes / 60) * 10) / 10
  }

  function isoWeekRange(week: number | null): { start: Date; end: Date } | null {
    if (week == null || !Number.isInteger(week) || week < 1 || week > 53) return null

    const now = new Date()
    const year = now.getFullYear()
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dow = simple.getDay() || 7
    const monday = new Date(simple)
    monday.setDate(simple.getDate() - (dow - 1))
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    return { start: monday, end: friday }
  }

  function plannedWeekLabel(row: {
    planned_week: number | null
    provisional_week: number | null
  }): string | null {
    const week = row.planned_week ?? row.provisional_week
    if (week == null) return null
    const range = isoWeekRange(week)
    if (!range) return String(week)

    const formatter = new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short'
    })

    const start = formatter.format(range.start)
    const end = formatter.format(range.end)
    const suffix = row.planned_week != null ? ' (gepland)' : ' (voorlopig)'
    return `${week} (${start} - ${end})${suffix}`
  }

  async function loadVisits(): Promise<void> {
    loading.value = true
    try {
      const query: Record<string, unknown> = {
        page: page.value,
        page_size: pageSize.value
      }
      const term = search.value.trim()
      if (term) query.search = term
      if (selectedStatuses.value.length > 0)
        query.statuses = selectedStatuses.value.map((s) => s.value)

      if (filterClusterNumber.value.trim()) {
        query.cluster_number = filterClusterNumber.value.trim()
      }
      if (filterFunctionIds.value.length > 0) {
        query.function_ids = filterFunctionIds.value
      }
      if (filterSpeciesIds.value.length > 0) {
        query.species_ids = filterSpeciesIds.value
      }

      if (isArchiveMode.value) {
        query.include_archived = true
        query.only_archived = true
      }

      if (testModeEnabled.value && simulatedDate.value) {
        query.simulated_today = simulatedDate.value
      }

      const data = await $api<VisitListResponse>('/visits', { query })
      rows.value = data.items.map((item) => ({
        ...item,
        researcher_ids: item.researchers.map((r) => r.id)
      }))
      total.value = data.total
      page.value = data.page
      pageSize.value = data.page_size
    } finally {
      loading.value = false
    }
  }

  function onPrevPage(): void {
    if (page.value <= 1) return
    page.value -= 1
    void loadVisits()
  }


  function onNextPage(): void {
    if (page.value >= maxPage.value) return
    page.value += 1
    void loadVisits()
  }

  async function onExportCsv() {
    const query: Record<string, unknown> = {}
    const term = search.value.trim()
    if (term) query.search = term
    
    if (selectedStatuses.value.length > 0) {
      query.statuses = selectedStatuses.value.map(s => s.value)
    }

    if (filterClusterNumber.value.trim()) {
      query.cluster_number = filterClusterNumber.value.trim()
    }
    
    if (filterFunctionIds.value.length > 0) {
      query.function_ids = filterFunctionIds.value
    }
    
    if (filterSpeciesIds.value.length > 0) {
      query.species_ids = filterSpeciesIds.value
    }

    if (isArchiveMode.value) {
      query.include_archived = true
      query.only_archived = true
    }

    if (testModeEnabled.value && simulatedDate.value) {
      query.simulated_today = simulatedDate.value
    }

    try {
      const blob = await $api<Blob>('/visits/export', {
        query,
        responseType: 'blob'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'bezoeken.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      toast.add({ title: 'Export mislukt', color: 'error' })
    }
  }

  const actionItems = computed(() => {
    const items = []
    if (isAdmin.value && !showCreate.value) {
      items.push([{
        label: 'Toevoegen',
        icon: 'i-heroicons-plus',
        onSelect: onStartCreate
      }])
    }
    items.push([{
      label: 'Export CSV',
      icon: 'i-lucide-download',
      onSelect: onExportCsv
    }])
    return items
  })

  let searchTimer: number | null = null
  watch(search, () => {
    if (searchTimer) window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      page.value = 1
      void loadVisits()
    }, 300)
  })

  watch(
    () => selectedStatuses.value.map((s) => s.value),
    () => {
      page.value = 1
      void loadVisits()
    }
  )

  watch(
    () => simulatedDate.value,
    () => {
      if (!testModeEnabled.value) return
      page.value = 1
      void loadVisits()
    }
  )

  watch(
    () => filterClusterNumber.value,
    () => {
      page.value = 1
      void loadVisits()
    }
  )

  watch(
    () => filterFunctionIds.value.join(','),
    () => {
      page.value = 1
      void loadVisits()
    }
  )

  watch(
    () => filterSpeciesIds.value.join(','),
    () => {
      page.value = 1
      void loadVisits()
    }
  )

  // --- Options for admin form ---

  const projectOptions = ref<ProjectOption[]>([])
  const projectDetails = ref<Array<{ id: number; code: string; location: string }>>([])
  const clusterOptions = ref<ClusterOption[]>([])
  const functionOptions = ref<Option[]>([])
  const speciesOptions = ref<Option[]>([])
  const speciesMeta = ref<CompactSpecies[]>([])
  const researcherOptions = ref<Option[]>([])

  const experienceLevelOptionsArr: StringOption[] = [
    { label: '\u00A0', value: null },
    { label: 'Medior', value: 'Medior' },
    { label: 'Senior', value: 'Senior' }
  ]

  function selectedExperienceOption(v: string | null | undefined): StringOption | undefined {
    if (v === null) return undefined
    return experienceLevelOptionsArr.find((o) => o.value === v)
  }

  function isVleermuisLabel(value: string | null | undefined): boolean {
    return (value ?? '').trim().toLowerCase() === 'vleermuis'
  }

  function hasVleermuisSpecies(species: CompactSpecies[]): boolean {
    return species.some(
      (sp) => isVleermuisLabel(sp.family_name) || isVleermuisLabel(sp.name)
    )
  }

  function hasVleermuisSpeciesIds(ids: number[]): boolean {
    if (ids.length === 0) return false
    const speciesById = new Map(speciesMeta.value.map((sp) => [sp.id, sp]))
    return ids.some((id) => {
      const sp = speciesById.get(id)
      if (!sp) return false
      return isVleermuisLabel(sp.family_name) || isVleermuisLabel(sp.name)
    })
  }

  function hasVleermuisCustomName(value: string | null | undefined): boolean {
    return (value ?? '').trim().toLowerCase().includes('vleermuis')
  }

  const showCreateExpertise = computed(() => {
    if (createCustomVisit.value) {
      return hasVleermuisCustomName(createCustomSpeciesName.value)
    }
    return hasVleermuisSpeciesIds(createSpeciesIds.value)
  })

  function showRowExpertise(row: VisitListRow): boolean {
    if (row.custom_species_name) {
      return hasVleermuisCustomName(row.custom_species_name)
    }
    return hasVleermuisSpecies(row.species)
  }

  const partOfDayOptions: StringOption[] = [
    { label: '\u00A0', value: null },
    { label: 'Ochtend', value: 'Ochtend' },
    { label: 'Dag', value: 'Dag' },
    { label: 'Avond', value: 'Avond' }
  ]

  function mapIdsToOptions(ids: number[] | undefined, options: Option[]): Option[] {
    if (!ids || ids.length === 0) return []
    const idSet = new Set(ids)
    return options.filter((o) => o.value !== null && idSet.has(o.value))
  }

  async function loadStaticOptions(): Promise<void> {
    const [projects, functions, species, users] = await Promise.all([
      $api<Array<{ id: number; code: string; location: string }>>('/projects'),
      $api<Array<{ id: number; name: string }>>('/visits/options/functions'),
      $api<
        Array<{
          id: number
          name: string
          abbreviation?: string | null
          family_name?: string | null
        }>
      >('/visits/options/species'),
      $api<Array<{ id: number; full_name: string | null }>>('/admin/users')
    ])
    projectDetails.value = projects
    projectOptions.value = projects.map((p) => ({ label: p.code, value: p.id }))
    functionOptions.value = functions.map((f) => ({ label: f.name, value: f.id }))
    speciesMeta.value = species.map((s) => ({
      id: s.id,
      name: s.name,
      abbreviation: s.abbreviation ?? null,
      family_name: s.family_name ?? null
    }))
    speciesOptions.value = speciesMeta.value.map((s) => ({
      label: s.name || s.abbreviation || '',
      value: s.id,
      abbreviation: s.abbreviation
    }))
    const mappedUsers = users
      .map((u) => ({ label: u.full_name ?? `Gebruiker #${u.id}`, value: u.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
    researcherOptions.value = [{ label: '\u00A0', value: null }, ...mappedUsers]
  }

  const selectedProject = ref<ProjectOption | undefined>(undefined)
  const selectedCluster = ref<ClusterOption | undefined>(undefined)

  const selectedProjectDetails = computed(() => {
    if (!selectedProject.value) return null
    return projectDetails.value.find((p) => p.id === selectedProject.value?.value) || null
  })

  const selectedClusterDetails = computed(() => {
    if (!selectedCluster.value) return null
    return { address: selectedCluster.value.address ?? '' }
  })

  async function onProjectChange(opt: ProjectOption | undefined): Promise<void> {
    selectedCluster.value = undefined
    clusterOptions.value = []
    if (!opt) return
    const clusters = await $api<Array<{ id: number; cluster_number: string; address: string }>>(
      '/clusters',
      { query: { project_id: opt.value } }
    )
    clusterOptions.value = clusters.map((c) => ({
      label: `Cluster ${c.cluster_number}`,
      value: c.id,
      address: c.address
    }))
  }

  // --- Create visit form state ---

  const showCreate = ref(false)
  const creating = ref(false)

  const createFunctionIds = ref<number[]>([])
  const createSpeciesIds = ref<number[]>([])
  const createRequiredResearchers = ref<number | null>(null)
  const createResearcherIds = ref<number[]>([])
  const createFromDate = ref('')
  const createToDate = ref('')
  const createPlannedDate = ref('')
  const createPlannedWeek = ref<number | null | ''>(null)
  const createProvisionalWeek = ref<number | null | ''>(null)
  const createPlanningLocked = ref(false)
  const createVisitNr = ref<number | null>(null)
  const createStartTimeText = ref('')
  const createPartOfDay = ref<string | null>(null)
  const createDurationHours = ref<number | null>(null)
  const createMinTemperature = ref<number | null>(null)
  const createMaxWind = ref<number | null>(null)
  const createMaxPrecipitation = ref<string | null>(null)
  const createExpertiseLevel = ref<string | null>(null)
  const createWbc = ref(false)
  const createFiets = ref(false)
  const createVog = ref(false)
  const createHub = ref(false)
  const createDvp = ref(false)
  const createSleutel = ref(false)
  const createPriority = ref(false)
  const createRemarksPlanning = ref<string | null>(null)
  const createRemarksField = ref<string | null>(null)
  const createCustomVisit = ref(false)
  const createCustomFunctionName = ref('')
  const createCustomSpeciesName = ref('')
  const createProvisionalLocked = ref(false)

  const createFunctions = computed(() =>
    mapIdsToOptions(createFunctionIds.value, functionOptions.value)
  )
  const createSpecies = computed(() =>
    mapIdsToOptions(createSpeciesIds.value, speciesOptions.value)
  )
  const createResearchers = computed(() =>
    mapIdsToOptions(createResearcherIds.value, researcherOptions.value)
  )

  function resetCreateForm(): void {
    selectedProject.value = undefined
    selectedCluster.value = undefined
    clusterOptions.value = []
    createFunctionIds.value = []
    createSpeciesIds.value = []
    createRequiredResearchers.value = null
    createResearcherIds.value = []
    createFromDate.value = ''
    createToDate.value = ''
    createPlannedDate.value = ''
    createPlannedWeek.value = null
    createProvisionalWeek.value = null
    createPlanningLocked.value = false
    createVisitNr.value = null
    createStartTimeText.value = ''
    createPartOfDay.value = null
    createDurationHours.value = null
    createMinTemperature.value = null
    createMaxWind.value = null
    createMaxPrecipitation.value = null
    createExpertiseLevel.value = null
    createWbc.value = false
    createFiets.value = false
    createVog.value = false
    createHub.value = false
    createDvp.value = false
    createSleutel.value = false
    createPriority.value = false
    createRemarksPlanning.value = null
    createRemarksField.value = null
    createCustomVisit.value = false
    createCustomFunctionName.value = ''
    createCustomSpeciesName.value = ''
    createProvisionalLocked.value = false
  }

  function onStartCreate(): void {
    showCreate.value = true
  }

  function onCancelCreate(): void {
    showCreate.value = false
    resetCreateForm()
  }

  async function onCreateVisit(): Promise<void> {
    if (!selectedCluster.value) {
      toast.add({ title: 'Kies eerst een project en cluster', color: 'error' })
      return
    }

    const plannedWeek = createPlannedWeek.value === '' ? null : createPlannedWeek.value
    const provisionalWeek =
      createProvisionalWeek.value === '' ? null : createProvisionalWeek.value

    if (!featureDailyPlanning.value && plannedWeek != null) {
      const plannedWeekError = validateIsoWeekWithinDateWindow({
        week: plannedWeek,
        fromDate: createFromDate.value || null,
        toDate: createToDate.value || null,
        label: 'Gepland voor week'
      })
      if (plannedWeekError) {
        toast.add({
          title: 'Bezoek kon niet worden toegevoegd',
          description: plannedWeekError,
          color: 'error'
        })
        return
      }
    }

    if (provisionalWeek != null) {
      const provisionalWeekError = validateIsoWeekWithinDateWindow({
        week: provisionalWeek,
        fromDate: createFromDate.value || null,
        toDate: createToDate.value || null,
        label: 'Voorlopige week'
      })
      if (provisionalWeekError) {
        toast.add({
          title: 'Bezoek kon niet worden toegevoegd',
          description: provisionalWeekError,
          color: 'error'
        })
        return
      }
    }

    if (createProvisionalLocked.value && provisionalWeek == null) {
      toast.add({
        title: 'Bezoek kon niet worden toegevoegd',
        description: 'Als voorlopige week is vastgezet, moet "Voorlopige week" ingevuld zijn.',
        color: 'error'
      })
      return
    }

    if (createPlanningLocked.value) {
      if (featureDailyPlanning.value) {
        if (!createPlannedDate.value) {
          toast.add({
            title: 'Bezoek kon niet worden toegevoegd',
            description: 'Als planning is vastgezet, moet "Geplande datum" ingevuld zijn.',
            color: 'error'
          })
          return
        }
      } else if (plannedWeek == null) {
        toast.add({
          title: 'Bezoek kon niet worden toegevoegd',
          description: 'Als planning is vastgezet, moet "Gepland voor week" ingevuld zijn.',
          color: 'error'
        })
        return
      }
      if (createResearcherIds.value.length === 0) {
        toast.add({
          title: 'Bezoek kon niet worden toegevoegd',
          description: 'Als planning is vastgezet, moet je minimaal één onderzoeker kiezen.',
          color: 'error'
        })
        return
      }
    }

    creating.value = true
    try {
      const durationMinutes =
        createDurationHours.value == null ? null : Math.round(createDurationHours.value * 60)

      const payload = {
        cluster_id: selectedCluster.value.value,
        required_researchers: createRequiredResearchers.value,
        visit_nr: createVisitNr.value,
        planned_week: plannedWeek,
        planned_date: createPlannedDate.value || null,
        planning_locked: createPlanningLocked.value,
        provisional_week: provisionalWeek,
        provisional_locked: createProvisionalLocked.value,
        from_date: createFromDate.value || null,
        to_date: createToDate.value || null,
        duration: durationMinutes,
        min_temperature_celsius: createMinTemperature.value,
        max_wind_force_bft: createMaxWind.value,
        max_precipitation: createMaxPrecipitation.value,
        expertise_level: createExpertiseLevel.value,
        wbc: createWbc.value,
        fiets: createFiets.value,
        vog: createVog.value,
        hub: createHub.value,
        dvp: createDvp.value,
        sleutel: createSleutel.value,
        remarks_planning: createRemarksPlanning.value,
        remarks_field: createRemarksField.value,
        priority: createPriority.value,
        part_of_day: createPartOfDay.value,
        start_time_text: createStartTimeText.value || null,
        function_ids: createCustomVisit.value ? [] : [...createFunctionIds.value],
        species_ids: createCustomVisit.value ? [] : [...createSpeciesIds.value],
        custom_function_name: createCustomVisit.value ? createCustomFunctionName.value : null,
        custom_species_name: createCustomVisit.value ? createCustomSpeciesName.value : null,
        researcher_ids: createResearcherIds.value.length > 0 ? [...createResearcherIds.value] : null
      }

      await $api('/visits', { method: 'POST', body: payload })
      toast.add({ title: 'Bezoek toegevoegd', color: 'success' })
      onCancelCreate()
      page.value = 1
      await loadVisits()
    } catch {
      toast.add({ title: 'Bezoek kon niet worden toegevoegd', color: 'error' })
    } finally {
      creating.value = false
    }
  }

  // --- Admin inline save/delete ---

  const savingId = ref<number | null>(null)
  const duplicatingId = ref<number | null>(null)

  async function onSaveVisit(row: VisitListRow): Promise<void> {
    const rawPlannedWeek = row.planned_week as unknown
    const plannedWeek =
      rawPlannedWeek === '' || rawPlannedWeek == null ? null : (rawPlannedWeek as number)
    if (!featureDailyPlanning.value && plannedWeek != null) {
      const plannedWeekError = validateIsoWeekWithinDateWindow({
        week: plannedWeek,
        fromDate: row.from_date,
        toDate: row.to_date,
        label: 'Gepland voor week'
      })
      if (plannedWeekError) {
        toast.add({
          title: 'Opslaan mislukt',
          description: plannedWeekError,
          color: 'error'
        })
        return
      }
    }

    const rawProvisionalWeek = row.provisional_week as unknown
    const provisionalWeek =
      rawProvisionalWeek === '' || rawProvisionalWeek == null ? null : (rawProvisionalWeek as number)
    if (provisionalWeek != null) {
      const provisionalWeekError = validateIsoWeekWithinDateWindow({
        week: provisionalWeek,
        fromDate: row.from_date,
        toDate: row.to_date,
        label: 'Voorlopige week'
      })
      if (provisionalWeekError) {
        toast.add({
          title: 'Opslaan mislukt',
          description: provisionalWeekError,
          color: 'error'
        })
        return
      }
    }

    if (row.provisional_locked && provisionalWeek == null) {
      toast.add({
        title: 'Opslaan mislukt',
        description: 'Als voorlopige week is vastgezet, moet "Voorlopige week" ingevuld zijn.',
        color: 'error'
      })
      return
    }

    if (row.planning_locked) {
      if (featureDailyPlanning.value) {
        if (!row.planned_date) {
          toast.add({
            title: 'Opslaan mislukt',
            description: 'Als planning is vastgezet, moet "Geplande datum" ingevuld zijn.',
            color: 'error'
          })
          return
        }
      } else if (plannedWeek == null) {
        toast.add({
          title: 'Opslaan mislukt',
          description: 'Als planning is vastgezet, moet "Gepland voor week" ingevuld zijn.',
          color: 'error'
        })
        return
      }
      const researcherIds = row.researcher_ids ?? row.researchers.map((r) => r.id)
      if (researcherIds.length === 0) {
        toast.add({
          title: 'Opslaan mislukt',
          description: 'Als planning is vastgezet, moet je minimaal één onderzoeker kiezen.',
          color: 'error'
        })
        return
      }
    }

    savingId.value = row.id
    try {
      const payload = {
        required_researchers: row.required_researchers,
        visit_nr: row.visit_nr,
        planned_week: plannedWeek,
        planned_date: row.planned_date || null,
        planning_locked: row.planning_locked,
        provisional_week: provisionalWeek,
        provisional_locked: row.provisional_locked,
        from_date: row.from_date,
        to_date: row.to_date,
        duration: row.duration,
        min_temperature_celsius: row.min_temperature_celsius,
        max_wind_force_bft: row.max_wind_force_bft,
        max_precipitation: row.max_precipitation,
        expertise_level: row.expertise_level,
        wbc: row.wbc,
        fiets: row.fiets,
        vog: row.vog,
        hub: row.hub,
        dvp: row.dvp,
        sleutel: row.sleutel,
        remarks_planning: row.remarks_planning,
        remarks_field: row.remarks_field,
        priority: row.priority,
        part_of_day: row.part_of_day,
        start_time_text: row.start_time_text,
        function_ids: row.function_ids,
        species_ids: row.species_ids,
        custom_function_name: row.custom_function_name,
        custom_species_name: row.custom_species_name,
        researcher_ids: row.researcher_ids ?? row.researchers.map((r) => r.id)
      }
      await $api(`/visits/${row.id}`, { method: 'PUT', body: payload })
      await loadVisits()
      toast.add({ title: 'Bezoek opgeslagen', color: 'success' })
    } catch {
      toast.add({ title: 'Opslaan mislukt', color: 'error' })
    } finally {
      savingId.value = null
    }
  }

  async function onDuplicateVisit(row: VisitListRow): Promise<void> {
    duplicatingId.value = row.id
    try {
      const rawPlannedWeek = row.planned_week as unknown
      const plannedWeek =
        rawPlannedWeek === '' || rawPlannedWeek == null ? null : (rawPlannedWeek as number)

      const rawProvisionalWeek = row.provisional_week as unknown
      const provisionalWeek =
        rawProvisionalWeek === '' || rawProvisionalWeek == null
          ? null
          : (rawProvisionalWeek as number)

      if (!featureDailyPlanning.value && plannedWeek != null) {
        const plannedWeekError = validateIsoWeekWithinDateWindow({
          week: plannedWeek,
          fromDate: row.from_date,
          toDate: row.to_date,
          label: 'Gepland voor week'
        })
        if (plannedWeekError) {
          toast.add({
            title: 'Dupliceren mislukt',
            description: plannedWeekError,
            color: 'error'
          })
          return
        }
      }

      if (provisionalWeek != null) {
        const provisionalWeekError = validateIsoWeekWithinDateWindow({
          week: provisionalWeek,
          fromDate: row.from_date,
          toDate: row.to_date,
          label: 'Voorlopige week'
        })
        if (provisionalWeekError) {
          toast.add({
            title: 'Dupliceren mislukt',
            description: provisionalWeekError,
            color: 'error'
          })
          return
        }
      }

      if (row.provisional_locked && provisionalWeek == null) {
        toast.add({
          title: 'Dupliceren mislukt',
          description: 'Als voorlopige week is vastgezet, moet "Voorlopige week" ingevuld zijn.',
          color: 'error'
        })
        return
      }

      const payload = {
        cluster_id: row.cluster_id,
        required_researchers: row.required_researchers,
        visit_nr: row.visit_nr,
        planned_week: plannedWeek,
        planned_date: row.planned_date || null,
        planning_locked: row.planning_locked,
        provisional_week: provisionalWeek,
        provisional_locked: row.provisional_locked,
        from_date: row.from_date,
        to_date: row.to_date,
        duration: row.duration,
        min_temperature_celsius: row.min_temperature_celsius,
        max_wind_force_bft: row.max_wind_force_bft,
        max_precipitation: row.max_precipitation,
        expertise_level: row.expertise_level,
        wbc: row.wbc,
        fiets: row.fiets,
        vog: row.vog,
        hub: row.hub,
        dvp: row.dvp,
        sleutel: row.sleutel,
        remarks_planning: row.remarks_planning,
        remarks_field: row.remarks_field,
        priority: row.priority,
        part_of_day: row.part_of_day,
        start_time_text: row.start_time_text,
        function_ids: row.function_ids,
        species_ids: row.species_ids,
        custom_function_name: row.custom_function_name,
        custom_species_name: row.custom_species_name,
        researcher_ids: row.researcher_ids ?? row.researchers.map((r) => r.id)
      }

      await $api('/visits', { method: 'POST', body: payload })
      toast.add({ title: 'Bezoek gedupliceerd', color: 'success' })
      page.value = 1
      await loadVisits()
    } catch {
      toast.add({ title: 'Dupliceren mislukt', color: 'error' })
    } finally {
      duplicatingId.value = null
    }
  }

  /* Delete Modal */
  const deleteModalOpen = ref(false)
  const visitToDelete = ref<VisitListRow | null>(null)
  const isDeleting = ref(false)

  function openDeleteModal(row: VisitListRow): void {
    visitToDelete.value = row
    deleteModalOpen.value = true
  }

  async function confirmDeleteVisit(): Promise<void> {
    if (!visitToDelete.value) return
    isDeleting.value = true
    try {
      await $api(`/visits/${visitToDelete.value.id}`, { method: 'DELETE' })
      toast.add({ title: 'Bezoek verwijderd', color: 'success' })
      deleteModalOpen.value = false
      await loadVisits()
    } catch {
      toast.add({ title: 'Verwijderen mislukt', color: 'error' })
    } finally {
      isDeleting.value = false
      visitToDelete.value = null
      tableKey.value++
    }
  }

  /* ... */

  // const deletingId = ref<number | null>(null) // Removed as we use shared state now

  function onOpenAdminPlanning(row: VisitListRow): void {
    selectedVisitForStatus.value = row
    statusModalOpen.value = true
  }

  onMounted(async () => {
    await auth.ensureLoaded()

    // Default: show all visits except approved/cancelled.
    // Users can clear this filter to see truly all visits.
    selectedStatuses.value = isArchiveMode.value 
      ? statusOptions
      : statusOptions.filter(
          (s) => s.value !== 'approved' && s.value !== 'cancelled' && s.value !== 'overdue'
        )

    if (isAdmin.value) {
      await loadStaticOptions()
    } else {
      const [functions, species] = await Promise.all([
        $api<Array<{ id: number; name: string }>>('/visits/options/functions'),
        $api<
          Array<{
            id: number
            name: string
            abbreviation?: string | null
            family_name?: string | null
          }>
        >('/visits/options/species')
      ])
      functionOptions.value = functions.map((f) => ({ label: f.name, value: f.id }))
      speciesMeta.value = species.map((s) => ({
        id: s.id,
        name: s.name,
        abbreviation: s.abbreviation ?? null,
        family_name: s.family_name ?? null
      }))
      speciesOptions.value = speciesMeta.value.map((s) => ({
        label: s.abbreviation ?? s.name,
        value: s.id
      }))
    }

    await loadVisits()
  })
</script>
