<script lang="ts">
  import { profiles, selectedProfileId, creatingProfile, processors } from '../stores';
  import { postMessage } from '../vscode';
  import ProfileForm from './ProfileForm.svelte';
  
  let showProfileForm = false;
  
  function selectProfile(id: string) {
    selectedProfileId.set(id);
  }
  
  function deleteProfile(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (confirm('Delete this profile? The rules will remain in the global pool.')) {
      postMessage({ command: 'deleteProfile', id });
    }
  }
  
  $: sortedProfiles = [...$profiles].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
</script>

<div class="profile-list">
  <div class="header">
    <h2>Profiles</h2>
    <button class="create-btn" on:click={() => showProfileForm = true}>
      + Create Profile
    </button>
  </div>
  
  <div class="profiles">
    {#each sortedProfiles as profile}
      <div 
        class="profile-item"
        class:selected={$selectedProfileId === profile.id}
        on:click={() => selectProfile(profile.id)}
        on:keydown={(e) => e.key === 'Enter' && selectProfile(profile.id)}
        role="button"
        tabindex="0"
      >
        <div class="profile-info">
          <div class="profile-name">{profile.name}</div>
          <div class="profile-meta">
            {(profile.postProcessorIds?.length || 0)} rules
          </div>
        </div>
        <button 
          class="delete-btn"
          on:click={(e) => deleteProfile(profile.id, e)}
          title="Delete profile"
        >
          ×
        </button>
      </div>
    {/each}
    
    {#if $profiles.length === 0}
      <div class="empty-state">
        {$processors.length} rules available.<br>
        Create a profile to use them.
      </div>
    {/if}
  </div>
</div>

<ProfileForm 
  isOpen={showProfileForm} 
  onClose={() => showProfileForm = false}
/>

<style>
  .profile-list {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--vscode-widget-border);
  }
  
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .create-btn {
    padding: 6px 12px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  
  .create-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  .profiles {
    flex: 1;
    overflow-y: auto;
  }
  
  .profile-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .profile-item:hover {
    background: var(--vscode-list-hoverBackground);
  }
  
  .profile-item.selected {
    background: var(--vscode-list-activeSelectionBackground);
    border-color: var(--vscode-list-activeSelectionBackground);
  }
  
  .profile-item.selected .profile-name,
  .profile-item.selected .profile-meta {
    color: var(--vscode-list-activeSelectionForeground);
  }
  
  .profile-name {
    font-weight: 500;
    font-size: 13px;
  }
  
  .profile-meta {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
  }
  
  .delete-btn {
    background: transparent;
    border: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    font-size: 18px;
    padding: 0 4px;
    line-height: 1;
  }
  
  .delete-btn:hover {
    color: var(--vscode-errorForeground);
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    line-height: 1.6;
  }
</style>
