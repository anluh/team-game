<script setup>
import { useLoadUsers, updateAllUserOrders, deleteUser, startGame, stopGame, getGameState, getQuests, updateTeamName, sendNotificationToTeam } from "../firebase"
import QuestionsManager from "../components/QuestionsManager.vue"
import TeamNotification from "../components/TeamNotification.vue"
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Authentication state
const isAuthenticated = ref(false)
const passwordInput = ref('')
const loginError = ref('')
const ADMIN_PASSWORD = '1122'

// Check if already authenticated on component mount
onMounted(() => {
  const savedAuth = sessionStorage.getItem('adminAuthenticated')
  if (savedAuth === 'true') {
    isAuthenticated.value = true
  }
  
  console.log("AdminPage mounted, game state:", gameState.value);
  if (gameState.value?.isStarted) {
    startTimer()
  }
})

// Login function
const handleLogin = () => {
  if (passwordInput.value === ADMIN_PASSWORD) {
    isAuthenticated.value = true
    sessionStorage.setItem('adminAuthenticated', 'true')
    loginError.value = ''
    passwordInput.value = ''
  } else {
    loginError.value = 'Неправильний пароль. Спробуйте ще раз.'
    passwordInput.value = ''
  }
}

// Logout function
const handleLogout = () => {
  isAuthenticated.value = false
  sessionStorage.removeItem('adminAuthenticated')
}

const users = useLoadUsers()
const quests = getQuests()
const gameState = getGameState()
const loading = ref(false)
const deletingUserId = ref(null)
const message = ref('')
const currentTime = ref(Date.now())
const timerInterval = ref(null)
const expandedUsers = ref(new Set())

// Team name editing state
const editingTeamId = ref(null)
const editingTeamName = ref('')
const savingTeamName = ref(false)

// Team message forms state
const sendingNotification = ref(false)
const teamMessageForms = ref({}) // For individual team message forms
const teamMessages = ref({}) // For individual team messages

// Timer functionality
const startTimer = () => {
  console.log("startTimer called");
  if (timerInterval.value) {
    console.log("Clearing existing timer interval");
    clearInterval(timerInterval.value)
  }
  timerInterval.value = setInterval(() => {
    currentTime.value = Date.now()
    // console.log("Timer tick, currentTime:", currentTime.value);
  }, 1000)
  console.log("Timer interval set with ID:", timerInterval.value);
}

const stopTimer = () => {
  console.log("stopTimer called");
  if (timerInterval.value) {
    console.log("Clearing timer interval with ID:", timerInterval.value);
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

// Game time calculation
const gameTime = computed(() => {
  if (!gameState.value?.isStarted || !gameState.value?.startTime) {
    // console.log("Game not started or no start time");
    return "00:00:00"
  }
  
  const elapsed = currentTime.value - gameState.value.startTime
  const hours = Math.floor(elapsed / (1000 * 60 * 60))
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000)
  
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  // console.log("Game time calculated:", timeString, "startTime:", gameState.value.startTime, "currentTime:", currentTime.value);
  return timeString
})

// Team quest progress
const teamProgress = computed(() => {
  return users.value.map(user => {
    const currentQuestIndex = user.currentQuestIndex || 0
    const currentQuestId = user.order?.[currentQuestIndex]
    const currentQuest = quests.value.find(q => q.id === currentQuestId)
    
    return {
      id: user.id,
      name: user.name,
      totalQuests: user.order?.length || 0,
      currentQuestIndex: currentQuestIndex,
      currentQuest: currentQuest?.question || "No quest",
      progress: user.order?.length ? `${currentQuestIndex + 1}/${user.order.length}` : "0/0",
      isCompleted: user.order?.length > 0 && currentQuestIndex >= user.order.length,
      progressPercentage: user.order?.length > 0 ? Math.round(((currentQuestIndex + 1) / user.order.length) * 100) : 0
    }
  })
})

// Get ordered questions for a user with truncated text
const getUserOrderedQuestions = (user) => {
  if (!user.order || !quests.value) return []
  
  return user.order.map((questId, index) => {
    const quest = quests.value.find(q => q.id === questId)
    return {
      index: index + 1,
      id: questId,
      question: quest?.question || 'Question not found',
      truncatedQuestion: truncateText(quest?.question || 'Question not found', 50)
    }
  })
}

// Helper function to truncate text
const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Toggle user questions dropdown
const toggleUserQuestions = (userId) => {
  if (expandedUsers.value.has(userId)) {
    expandedUsers.value.delete(userId)
  } else {
    expandedUsers.value.add(userId)
  }
  // Trigger reactivity
  expandedUsers.value = new Set(expandedUsers.value)
}

// Team name editing functions
const startEditingTeamName = async (userId, currentName) => {
  editingTeamId.value = userId
  editingTeamName.value = currentName
  
  // Focus the input field after DOM update
  await nextTick()
  const input = document.querySelector('.name-input')
  if (input) {
    input.focus()
    input.select()
  }
}

const cancelEditingTeamName = () => {
  editingTeamId.value = null
  editingTeamName.value = ''
}

const saveTeamName = async (userId) => {
  if (!editingTeamName.value.trim()) {
    alert('Team name cannot be empty')
    return
  }
  
  savingTeamName.value = true
  
  try {
    await updateTeamName(userId, editingTeamName.value.trim())
    message.value = 'Team name updated successfully!'
    editingTeamId.value = null
    editingTeamName.value = ''
    setTimeout(() => {
      message.value = ''
    }, 3000)
  } catch (error) {
    console.error('Error updating team name:', error)
    message.value = `Error updating team name: ${error.message}`
    setTimeout(() => {
      message.value = ''
    }, 5000)
  } finally {
    savingTeamName.value = false
  }
}

// Game control functions
const handleStartGame = async () => {
  console.log("handleStartGame clicked");
  loading.value = true
  message.value = ''
  
  try {
    console.log("About to call startGame()");
    await startGame()
    console.log("startGame() completed successfully");
    
    console.log("About to start timer");
    startTimer()
    console.log("Timer started");
    
    message.value = 'Game started successfully! All teams can now see their quests.'
    console.log("Success message set");
    
    setTimeout(() => {
      message.value = ''
    }, 3000)
  } catch (error) {
    console.error("Error in handleStartGame:", error);
    message.value = `Error starting game: ${error.message}`
    setTimeout(() => {
      message.value = ''
    }, 5000)
  } finally {
    loading.value = false
    console.log("handleStartGame completed, loading set to false");
  }
}

const handleStopGame = async () => {
  if (confirm('Are you sure you want to stop the game? This will end the session for all teams.')) {
    loading.value = true
    message.value = ''
    
    try {
      await stopGame()
      stopTimer()
      message.value = 'Game stopped successfully!'
      setTimeout(() => {
        message.value = ''
      }, 3000)
    } catch (error) {
      message.value = `Error stopping game: ${error.message}`
      setTimeout(() => {
        message.value = ''
      }, 5000)
    } finally {
      loading.value = false
    }
  }
}

const regenerateOrders = async () => {
  if (confirm('This will regenerate random orders for all users. Are you sure?')) {
    loading.value = true
    message.value = ''
    
    try {
      await updateAllUserOrders()
      message.value = 'All user orders have been regenerated successfully!'
      setTimeout(() => {
        message.value = ''
      }, 3000)
    } catch (error) {
      message.value = `Error regenerating orders: ${error.message}`
      setTimeout(() => {
        message.value = ''
      }, 5000)
    } finally {
      loading.value = false
    }
  }
}

const confirmDeleteTeam = async (userId, teamName) => {
  const confirmed = confirm(`Are you sure you want to delete team "${teamName}"?\n\nThis action cannot be undone and will permanently remove all their progress.`)
  
  if (confirmed) {
    deletingUserId.value = userId
    message.value = ''
    
    try {
      await deleteUser(userId)
      message.value = `Team "${teamName}" has been deleted successfully!`
      setTimeout(() => {
        message.value = ''
      }, 3000)
    } catch (error) {
      message.value = `Error deleting team: ${error.message}`
      setTimeout(() => {
        message.value = ''
      }, 5000)
    } finally {
      deletingUserId.value = null
    }
  }
}

// Individual team message functions
const showTeamMessageForm = (teamId) => {
  teamMessageForms.value[teamId] = true
  if (!teamMessages.value[teamId]) {
    teamMessages.value[teamId] = ''
  }
}

const hideTeamMessageForm = (teamId) => {
  teamMessageForms.value[teamId] = false
  teamMessages.value[teamId] = ''
}

const sendTeamMessage = async (teamId) => {
  const messageText = teamMessages.value[teamId]
  if (!messageText || !messageText.trim()) {
    alert('Будь ласка, введіть повідомлення')
    return
  }
  
  sendingNotification.value = true
  
  try {
    await sendNotificationToTeam(teamId, messageText)
    const teamName = users.value.find(u => u.id === teamId)?.name || 'Unknown Team'
    
    // Success message
    const successMsg = `Повідомлення надіслано команді "${teamName}"!`
    message.value = successMsg
    setTimeout(() => {
      message.value = ''
    }, 3000)
    
    // Hide form and clear message
    hideTeamMessageForm(teamId)
    
  } catch (error) {
    console.error('Error sending team message:', error)
    alert(`Помилка відправки повідомлення: ${error.message}`)
  } finally {
    sendingNotification.value = false
  }
}

// Watch for game state changes to start/stop timer
watch(() => gameState.value?.isStarted, (isStarted) => {
  console.log("Game state changed, isStarted:", isStarted);
  if (isStarted) {
    startTimer()
  } else {
    stopTimer()
  }
}, { immediate: true })

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <!-- Login Form -->
  <div v-if="!isAuthenticated" class="login-container">
    <div class="login-form">
      <h1>🔐 Admin Access</h1>
      <p>Enter the admin password to access the control panel:</p>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <input
            v-model="passwordInput"
            type="password"
            placeholder="Enter admin password..."
            class="password-input"
            autocomplete="current-password"
          />
        </div>
        
        <button type="submit" class="login-btn" :disabled="!passwordInput.trim()">
          🚀 Access Admin Panel
        </button>
        
        <div v-if="loginError" class="error-message">
          ❌ {{ loginError }}
        </div>
      </form>
    </div>
  </div>

  <!-- Admin Panel -->
  <div v-else class="admin-page">
    <div class="admin-header">
      <h1>Admin Page</h1>
      <button @click="handleLogout" class="logout-btn">
        🚪 Logout
      </button>
    </div>

    <!-- Game Control Section -->
    <section class="admin-section game-control">
      <div class="section-header">
        <h2>Game Control</h2>
        <div class="game-timer">
          <span class="timer-label">Game Time:</span>
          <span class="timer-value">{{ gameTime }}</span>
          <span class="game-status" :class="gameState?.status || 'waiting'">
            {{ gameState?.isStarted ? 'ACTIVE' : 'STOPPED' }}
          </span>
        </div>
      </div>
      
      <!-- Message display -->
      <div v-if="message" :class="['alert', message.includes('Error') || message.includes('failed') ? 'alert-error' : 'alert-success']">
        {{ message }}
      </div>
      
      <div class="game-controls">
        <button 
          @click="handleStartGame" 
          class="btn btn-success btn-lg"
          :disabled="loading || gameState?.isStarted"
        >
          {{ loading && !gameState?.isStarted ? 'Starting...' : 'Start Game' }}
        </button>
        
        <button 
          @click="handleStopGame" 
          class="btn btn-danger btn-lg"
          :disabled="loading || !gameState?.isStarted"
        >
          {{ loading && gameState?.isStarted ? 'Stopping...' : 'Stop Game' }}
        </button>
      </div>
    </section>

    <!-- Teams Management Section -->
    <section class="admin-section">
      <div class="section-header">
        <h2>Teams Management</h2>
        <button 
          @click="regenerateOrders" 
          class="btn btn-warning"
          :disabled="loading || users.length === 0 || gameState?.isStarted"
        >
          {{ loading ? 'Regenerating...' : 'Regenerate All Orders' }}
        </button>
      </div>
      
      <div class="users-list">
        <div v-for="user in users" :key="user.id" class="user-item">
          <div class="user-content">
            <div class="user-actions">
              <!-- Edit Team Name Button -->
              <button 
                @click="startEditingTeamName(user.id, user.name)"
                class="btn btn-primary btn-sm"
                :disabled="loading || savingTeamName || editingTeamId === user.id"
                title="Edit team name"
              >
                Edit
              </button>
              
              <!-- Send Message Button -->
              <button 
                @click="showTeamMessageForm(user.id)"
                class="btn btn-success btn-sm"
                :disabled="sendingNotification || teamMessageForms[user.id]"
                title="Send message to this team"
              >
                📢 Message
              </button>
              
              <!-- Delete Team Button -->
              <button 
                @click="confirmDeleteTeam(user.id, user.name)"
                class="btn btn-danger btn-sm"
                :disabled="deletingUserId === user.id"
              >
                {{ deletingUserId === user.id ? 'Deleting...' : 'Delete Team' }}
              </button>
            </div>
            
            <div class="user-info">
              <!-- Team name display/edit -->
              <div class="team-name-section">
                <!-- Display mode -->
                <div v-if="editingTeamId !== user.id" class="name-display">
                  <span class="value">{{ user.name }}</span>
                </div>
                
                <!-- Edit mode -->
                <div v-else class="name-edit">
                  <input 
                    v-model="editingTeamName"
                    type="text"
                    class="name-input"
                    placeholder="Enter team name"
                    @keyup.enter="saveTeamName(user.id)"
                    @keyup.escape="cancelEditingTeamName"
                    ref="nameInput"
                  >
                  <div class="edit-actions">
                    <button 
                      @click="saveTeamName(user.id)"
                      class="btn btn-success btn-xs"
                      :disabled="savingTeamName || !editingTeamName.trim()"
                    >
                      {{ savingTeamName ? '💾' : '✓' }}
                    </button>
                    <button 
                      @click="cancelEditingTeamName"
                      class="btn btn-secondary btn-xs"
                      :disabled="savingTeamName"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Team Notification (if any) -->
              <TeamNotification :teamId="user.id" :isAdmin="true" />
              
              <div v-if="user.order && user.order.length > 0" class="order-info">
                <div class="order-header" @click="toggleUserQuestions(user.id)">
                  <span class="order-label">Порядок питань:</span>
                  <span class="order-value">{{ user.order.length }} questions</span>
                  <span class="dropdown-arrow" :class="{ 'expanded': expandedUsers.has(user.id) }">▼</span>
                </div>
                
                <div v-if="expandedUsers.has(user.id)" class="questions-list">
                  <div 
                    v-for="orderedQuest in getUserOrderedQuestions(user)" 
                    :key="orderedQuest.id"
                    class="question-item"
                    :class="{ 'current': (user.currentQuestIndex || 0) === orderedQuest.index - 1 }"
                  >
                    <span class="question-number">{{ orderedQuest.index }}.</span>
                    <span class="question-text" :title="orderedQuest.question">
                      {{ orderedQuest.truncatedQuestion }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div v-else class="order-info">
                <span class="order-label">⚠️ No quest order assigned</span>
              </div>
            </div>
            
            <!-- Individual Team Message Form -->
            <div v-if="teamMessageForms[user.id]" class="team-message-form">
              <div class="message-form-header">
                <h4>📢 Send Message to {{ user.name }}</h4>
                <button 
                  @click="hideTeamMessageForm(user.id)"
                  class="btn btn-secondary btn-xs"
                  :disabled="sendingNotification"
                >
                  ✕
                </button>
              </div>
              
              <div class="message-form-body">
                <textarea 
                  v-model="teamMessages[user.id]"
                  placeholder="Enter your message for this team..."
                  rows="3"
                  maxlength="500"
                  class="team-message-input"
                ></textarea>
                <small class="char-count">
                  {{ (teamMessages[user.id] || '').length }}/500 characters
                </small>
              </div>
              
              <div class="message-form-actions">
                <button 
                  @click="hideTeamMessageForm(user.id)"
                  class="btn btn-secondary btn-sm"
                  :disabled="sendingNotification"
                >
                  Cancel
                </button>
                <button 
                  @click="sendTeamMessage(user.id)"
                  class="btn btn-primary btn-sm"
                  :disabled="sendingNotification || !(teamMessages[user.id] || '').trim()"
                >
                  {{ sendingNotification ? 'Sending...' : '📤 Send Message' }}
                </button>
              </div>
            </div>
            
            <!-- Progress indicator -->
            <div class="progress-indicator">
              <span v-if="user.order && user.order.length > 0" class="progress-text">
                {{ Math.min((user.currentQuestIndex || 0) + 1, user.order.length) }}/{{ user.order.length }}
              </span>
              <span v-else class="progress-text">0/0</span>
            </div>
          </div>
        </div>
        <div v-if="users.length === 0" class="empty-state">
          No teams registered yet.
        </div>
      </div>
    </section>

    <!-- Questions Management Section -->
    <section class="admin-section">
      <QuestionsManager />
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.admin-page h1 {
  text-align: center;
  color: #333;
  margin-bottom: 40px;
  font-size: 2.5rem;
}

.admin-section {
  margin-bottom: 60px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.game-control {
  border-left: 4px solid #28a745;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-section h2 {
  margin: 0;
  color: #495057;
  font-size: 1.5rem;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 8px;
  flex: 1;
}

.game-timer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: monospace;
  font-size: 1.2rem;
}

.timer-label {
  color: #6c757d;
  font-weight: 500;
}

.timer-value {
  background: #343a40;
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: bold;
}

.game-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.game-status.active {
  background: #d4edda;
  color: #155724;
}

.game-status.stopped,
.game-status.waiting {
  background: #f8d7da;
  color: #721c24;
}

.team-count {
  color: #6c757d;
  font-size: 0.9rem;
}

.game-controls {
  display: flex;
  gap: 16px;
  justify-content: center;
}



/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 16px;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #218838;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.alert {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.users-list {
  display: grid;
  gap: 12px;
}

.user-item {
  background: white;
  border-radius: 6px;
  border-left: 4px solid #007bff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
}

.user-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 16px;
  padding-right: 120px; /* Make space for absolute positioned buttons */
  gap: 16px;
}

.user-info {
  flex: 1;
}

.user-item .label {
  font-weight: 600;
  color: #495057;
}

.user-item .value {
  color: #212529;
  margin-left: 8px;
}

.order-info {
  margin-top: 8px;
  font-size: 0.9rem;
}

.order-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
  transition: background-color 0.2s;
  border-radius: 4px;
}

.order-header:hover {
  background-color: #f8f9fa;
}

.dropdown-arrow {
  margin-left: auto;
  font-size: 0.8rem;
  transition: transform 0.2s;
  color: #6c757d;
}

.dropdown-arrow.expanded {
  transform: rotate(180deg);
}

.questions-list {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.question-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  font-size: 0.85rem;
  line-height: 1.3;
}

.question-item.current {
  background-color: #e3f2fd;
  border-radius: 3px;
  padding: 6px 8px;
  margin: 2px 0;
  border-left: 3px solid #2196f3;
}

.question-number {
  font-weight: bold;
  color: #495057;
  margin-right: 8px;
  min-width: 20px;
}

.question-text {
  flex: 1;
  color: #6c757d;
}

.question-item.current .question-text {
  color: #1976d2;
  font-weight: 500;
}

.current-indicator {
  font-size: 0.75rem;
  color: #2196f3;
  font-weight: bold;
  margin-left: 8px;
}

.order-label {
  font-weight: 500;
  color: #6c757d;
}

.order-value {
  color: #495057;
  margin-left: 8px;
}

.user-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.progress-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.progress-text {
  font-family: monospace;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6c757d;
  font-style: italic;
}

.team-name-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.name-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-input {
  padding: 6px 8px;
  border: 2px solid #007bff;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #212529;
  max-width: 200px;
}

.name-input:focus {
  outline: none;
  border-color: #0056b3;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.btn-edit {
  background: none;
  border: 1px solid #dee2e6;
  color: #6c757d;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #007bff;
  color: #007bff;
}

.btn-xs {
  padding: 4px 8px;
  font-size: 11px;
  min-width: 24px;
}

/* Team Message Form Styles */
.team-message-form {
  margin-top: 12px;
  padding: 16px;
  background: #fff;
  border: 2px solid #007bff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.message-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #dee2e6;
}

.message-form-header h4 {
  margin: 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.message-form-body {
  margin-bottom: 12px;
}

.team-message-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  min-height: 70px;
  color: #333;
  background-color: #fff;
}

.team-message-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.team-message-input::placeholder {
  color: #999;
}

.message-form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Fix text color issues */
.user-item .label {
  font-weight: 600;
  color: #495057;
}

.user-item .value {
  color: #212529;
  margin-left: 8px;
}

.name-display .value {
  color: #212529;
  font-weight: 500;
}

.order-label {
  font-weight: 500;
  color: #6c757d;
}

.order-value {
  color: #495057;
  margin-left: 8px;
}

.question-text {
  flex: 1;
  color: #6c757d;
}

.question-item.current .question-text {
  color: #1976d2;
  font-weight: 500;
}

.char-count {
  display: block;
  text-align: right;
  margin-top: 4px;
  color: #6c757d;
  font-size: 11px;
}

/* Button improvements */
.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #218838;
}

.btn-success:disabled {
  background-color: #6c757d;
  color: #fff;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  background-color: #6c757d;
  color: #fff;
}

/* New styles for team name editing */
@media (max-width: 768px) {
  .admin-page {
    padding: 12px;
  }
  
  .admin-page h1 {
    font-size: 2rem;
    margin-bottom: 30px;
  }
  
  .admin-section {
    padding: 16px;
    margin-bottom: 40px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .admin-section h2 {
    border-bottom: none;
    margin-bottom: 12px;
  }
  
  .game-controls {
    flex-direction: column;
  }
  
  .user-content {
    flex-direction: column;
    gap: 12px;
    padding-right: 16px; /* Reset padding on mobile */
  }
  
  .user-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    /* Keep absolute positioning on mobile too */
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .team-message-form {
    margin-top: 10px;
    padding: 12px;
  }
  
  .message-form-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .message-form-header h4 {
    font-size: 13px;
  }
  
  .team-message-input {
    font-size: 14px;
    min-height: 60px;
  }
  
  .message-form-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .char-count {
    font-size: 10px;
  }
}

/* Login Form Styles */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  padding: 20px;
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 123, 255, 0.3);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.login-form h1 {
  color: #007bff;
  margin-bottom: 16px;
  font-size: 28px;
  font-weight: 700;
}

.login-form p {
  color: #6c757d;
  margin-bottom: 24px;
  font-size: 16px;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 20px;
}

.password-input {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background-color: #fff;
  color: #212529;
}

.password-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
}

.login-btn {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  font-weight: 500;
  padding: 12px;
  background: #f8d7da;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
}

/* Admin Header Styles */
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e9ecef;
}

.admin-header h1 {
  margin: 0;
  color: #007bff;
  font-size: 32px;
  font-weight: 700;
}

.logout-btn {
  padding: 10px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

/* Mobile Responsive for Login */
@media (max-width: 768px) {
  .login-form {
    padding: 30px 20px;
    margin: 10px;
  }
  
  .login-form h1 {
    font-size: 24px;
  }
  
  .admin-header {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .admin-header h1 {
    font-size: 24px;
  }
}
</style>
