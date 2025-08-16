<script setup>
import { ref, computed } from 'vue'
import { getTeamNotification, respondToTeamNotification, clearTeamNotification } from '../firebase'

const props = defineProps({
  teamId: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const notification = getTeamNotification(props.teamId)
const responding = ref(false)
const clearing = ref(false)

// Check if this team has already responded
const teamResponse = computed(() => {
  return notification.value?.response || null
})

// Show notification if active (regardless of response status)
const showNotification = computed(() => {
  return notification.value && notification.value.isActive
})

const handleResponse = async (response) => {
  if (responding.value || teamResponse.value) return
  
  responding.value = true
  
  try {
    await respondToTeamNotification(props.teamId, response)
    // Note: We don't hide the notification anymore - it stays visible
  } catch (error) {
    console.error('Error sending response:', error)
    alert('Помилка відправки відповіді. Спробуйте ще раз.')
  } finally {
    responding.value = false
  }
}

const handleRemoveMessage = async () => {
  if (clearing.value) return
  
  clearing.value = true
  
  try {
    await clearTeamNotification(props.teamId)
  } catch (error) {
    console.error('Error removing message:', error)
    alert('Помилка видалення повідомлення.')
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <!-- Notification Bar (full-width, part of page) -->
  <div v-if="showNotification" class="notification-bar">
    <div class="notification-content">
      <!-- Message Header -->
      <div class="message-header">
        <div class="message-info">
          <h3 class="message-title">📢 Повідомлення від адміністратора</h3>
          <div class="message-time">
            {{ new Date(notification.timestamp).toLocaleString() }}
          </div>
        </div>
        
        <!-- Remove button for admin view -->
        <button 
          v-if="isAdmin"
          @click="handleRemoveMessage"
          class="remove-btn"
          :disabled="clearing"
          title="Remove message"
        >
          {{ clearing ? '⏳' : '🗑️' }}
        </button>
      </div>
      
      <!-- Message Text -->
      <div class="message-body">
        <p class="message-text">{{ notification.message }}</p>
      </div>
      
      <!-- Response Section -->
      <div class="response-section">
        <!-- Show response buttons if not yet responded and not admin view -->
        <div v-if="!teamResponse && !isAdmin" class="response-actions">
          <span class="response-label">Ваша відповідь:</span>
          <div class="response-buttons">
            <button 
              @click="handleResponse('так')"
              :disabled="responding"
              class="response-btn yes-btn"
            >
              {{ responding ? '⏳' : '✅' }} Так
            </button>
            
            <button 
              @click="handleResponse('ні')"
              :disabled="responding"
              class="response-btn no-btn"
            >
              {{ responding ? '⏳' : '❌' }} Ні
            </button>
          </div>
        </div>
        
        <!-- Show given response -->
        <div v-if="teamResponse" class="response-given">
          <span class="response-label">{{ isAdmin ? 'Відповідь команди:' : 'Ваша відповідь:' }}</span>
          <div class="response-display">
            <span class="response-badge" :class="teamResponse.answer">
              {{ teamResponse.answer === 'так' ? '✅ Так' : '❌ Ні' }}
            </span>
            <small class="response-time">
              {{ new Date(teamResponse.timestamp).toLocaleString() }}
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-bar {
  width: 100%;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
  overflow: hidden;
}

.notification-content {
  padding: 12px 16px;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.message-info {
  flex: 1;
}

.message-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.message-time {
  font-size: 11px;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.8);
}

.remove-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.remove-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.message-body {
  margin-bottom: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.message-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: white;
  font-weight: 500;
}

.response-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px;
}

.response-label {
  display: block;
  font-weight: 600;
  color: white;
  font-size: 12px;
  margin-bottom: 8px;
}

.response-buttons {
  display: flex;
  gap: 8px;
}

.response-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.yes-btn:hover:not(:disabled) {
  background: rgba(40, 167, 69, 0.8);
  border-color: rgba(40, 167, 69, 0.8);
  transform: translateY(-1px);
}

.no-btn:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.8);
  border-color: rgba(220, 53, 69, 0.8);
  transform: translateY(-1px);
}

.response-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.response-given {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.response-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.response-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.response-badge.так {
  background: rgba(40, 167, 69, 0.8);
  border-color: rgba(40, 167, 69, 0.8);
}

.response-badge.ні {
  background: rgba(220, 53, 69, 0.8);
  border-color: rgba(220, 53, 69, 0.8);
}

.response-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .notification-bar {
    border-radius: 6px;
    margin-bottom: 12px;
  }
  
  .notification-content {
    padding: 10px 12px;
  }
  
  .message-header {
    flex-direction: row;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .message-title {
    font-size: 13px;
  }
  
  .message-text {
    font-size: 13px;
  }
  
  .response-buttons {
    gap: 6px;
  }
  
  .response-btn {
    font-size: 12px;
    padding: 7px 10px;
    min-height: 32px;
  }
  
  .remove-btn {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .message-body {
    padding: 8px 12px;
    margin-bottom: 10px;
  }
  
  .response-section {
    padding: 8px;
  }
}

@media (max-width: 360px) {
  .notification-content {
    padding: 8px 10px;
  }
  
  .message-body {
    padding: 6px 10px;
    margin-bottom: 8px;
  }
  
  .response-section {
    padding: 6px;
  }
  
  .response-buttons {
    flex-direction: column;
    gap: 4px;
  }
}
</style> 