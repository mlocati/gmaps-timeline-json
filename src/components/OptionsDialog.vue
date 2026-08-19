<script setup lang="ts">
import {ref} from 'vue';
import ModalDialog from './ModalDialog.vue';
import {hasApiKey, isCurrentApiKeyValid, setApiKey} from '../places_api';

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'save'): void;
}>();

enum ApiKeyAction {
  Keep = 'keep',
  Set = 'set',
  Clear = 'clear',
}

const apiKeyIsSet = hasApiKey();
const apiKeyAction = ref<ApiKeyAction>(apiKeyIsSet ? ApiKeyAction.Keep : ApiKeyAction.Set);
const newApiKey = ref<string>('');
const saveError = ref<string>('');
const saving = ref<boolean>(false);

async function applyApiKey(): Promise<boolean> {
  switch (apiKeyAction.value) {
    case ApiKeyAction.Clear:
      return await setApiKey('');
    case ApiKeyAction.Set: {
      const key = newApiKey.value.trim();
      if (!key) {
        return apiKeyIsSet ? await isCurrentApiKeyValid() : true;
      }
      if (!(await setApiKey(key))) {
        saveError.value = 'The Places API key is not valid.';
        return false;
      }
      return true;
    }
    default:
      if (!(await isCurrentApiKeyValid())) {
        saveError.value = 'The currently saved Places API key is no longer valid.';
        return false;
      }
      return true;
  }
}

async function save(): Promise<void> {
  if (saving.value) {
    return;
  }
  saving.value = true;
  saveError.value = '';
  let saved: boolean;
  try {
    saved = await applyApiKey();
  } catch (error) {
    saved = false;
    saveError.value = (error as Error)?.message || error?.toString() || 'Unknown error';
  } finally {
    saving.value = false;
  }
  if (saved) {
    emit('save');
  }
}

function cancel(): void {
  if (!saving.value) {
    emit('cancel');
  }
}

function setApiKeyAction(action: ApiKeyAction): void {
  saveError.value = '';
  newApiKey.value = '';
  apiKeyAction.value = action;
}
</script>

<template>
  <ModalDialog title="Options" :busy="saving" @close="cancel" @submit="save">
    <label class="form-label" for="options-places-api-key">Google Places API key</label>
    <template v-if="apiKeyAction === ApiKeyAction.Keep">
      <div class="d-flex align-items-center gap-2">
        <span class="flex-grow-1">An API key is currently set.</span>
        <button
          type="button"
          class="btn btn-sm btn-secondary"
          :disabled="saving"
          @click.prevent="setApiKeyAction(ApiKeyAction.Set)"
        >
          Change
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          :disabled="saving"
          @click.prevent="setApiKeyAction(ApiKeyAction.Clear)"
        >
          Remove
        </button>
      </div>
    </template>
    <template v-else-if="apiKeyAction === ApiKeyAction.Clear">
      <div class="d-flex align-items-center gap-2">
        <span class="flex-grow-1">The API key will be removed when you save.</span>
        <button
          type="button"
          class="btn btn-sm btn-secondary"
          :disabled="saving"
          @click.prevent="setApiKeyAction(ApiKeyAction.Keep)"
        >
          Undo
        </button>
      </div>
    </template>
    <template v-else>
      <div class="d-flex align-items-center gap-2">
        <input
          id="options-places-api-key"
          v-model="newApiKey"
          type="text"
          class="form-control"
          autocomplete="off"
          spellcheck="false"
          :placeholder="apiKeyIsSet ? 'Enter the new API key' : 'Enter the API key'"
          :disabled="saving"
        />
        <button
          v-if="apiKeyIsSet"
          type="button"
          class="btn btn-sm btn-secondary text-nowrap"
          :disabled="saving"
          @click.prevent="setApiKeyAction(ApiKeyAction.Keep)"
        >
          Undo
        </button>
      </div>
    </template>
    <div class="form-text">
      Used to resolve the names of the visited places.
      <template v-if="!apiKeyIsSet">Leave it empty to disable the place name lookup.</template>
    </div>
    <details v-if="apiKeyAction === ApiKeyAction.Set" class="mt-3">
      <summary>How to get an API key</summary>
      <ol class="mt-2 mb-0 ps-3">
        <li>
          Go to
          <a href="https://console.cloud.google.com" target="_blank" rel="noopener">console.cloud.google.com</a>
        </li>
        <li>Select an existing project or create a new one</li>
        <li>In the left menu, go to <em>APIs &amp; Services</em> &gt; <em>Library</em></li>
        <li>Search for <em>Places API (New)</em> and enable it</li>
        <li>
          In the left menu, go to <em>APIs &amp; Services</em> &gt; <em>Credentials</em>, then
          <em>Create Credentials</em> &gt; <em>API key</em>
          <div class="form-text">
            It's recommended to limit the key with <em>API restrictions</em> &gt; <em>Places API (New)</em>
          </div>
        </li>
        <li>Copy the API key and paste it in the field above</li>
      </ol>
    </details>
    <div v-if="saveError" class="alert alert-danger mt-3 mb-0" role="alert">{{ saveError }}</div>
    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="saving" @click.prevent="cancel">Cancel</button>
      <button type="submit" class="btn btn-primary" :disabled="saving">Save</button>
    </template>
  </ModalDialog>
</template>
