<script setup>
import { getGeneralSettings, getQuests, getUserProgress, updateUserProgress, getGameState } from '../firebase'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import VQuest from '../components/VQuest.vue';
import TeamNotification from '../components/TeamNotification.vue';

// Define props for route parameters
const props = defineProps({
  userId: String
})

const router = useRouter();
const route = useRoute();

const general = getGeneralSettings()
const quests = getQuests()
const gameState = getGameState()

// Initialize refs
const userProgress = ref({
  currentQuestIndex: 0,
  order: [],
  userData: null
})
const userId = ref(null)
const allQuestsCompleted = ref(false)
let validationInterval = null

onMounted(() => {
  // First, check if userId is provided via route parameter
  if (props.userId) {
    userId.value = props.userId
    // Store in sessionStorage for this session
    window.sessionStorage.setItem('user', userId.value)
  } else {
    // Fall back to sessionStorage
    userId.value = window.sessionStorage.getItem('user')
  }
  
  // Validate and redirect if no user found or invalid user ID
  if (!userId.value || !isValidUserId(userId.value)) {
    console.log('No valid user ID found, redirecting to home with cleanup. User ID:', userId.value)
    redirectToHomeWithCleanup('No valid team found. Please create a new team or join an existing one.')
    return
  }
  
  console.log('Loading user progress for valid userId:', userId.value)
  
  // Get user progress (including quest order and current question index)
  const progressRef = getUserProgress(userId.value)
  
  // Watch the Firebase ref and update our local ref
  watch(progressRef, (newValue) => {
    console.log('User progress updated:', newValue)
    
    if (newValue === null) {
      // This will be handled by the separate watch below
      userProgress.value = null
    } else {
      userProgress.value = newValue || {
        currentQuestIndex: 0,
        order: [],
        userData: null
      }
      
      // Check if user has completed all questions (on load or update)
      if (newValue && newValue.order && newValue.order.length > 0) {
        const currentIndex = newValue.currentQuestIndex || 0
        const totalQuestions = newValue.order.length
        
        // If currentQuestIndex >= total questions, user has completed all
        if (currentIndex >= totalQuestions) {
          console.log('User has completed all questions, showing finish screen')
          allQuestsCompleted.value = true
        }
      }
    }
  }, { immediate: true })
})

// Cleanup on unmount
onUnmounted(() => {
  console.log('QuestsPage unmounting, cleaning up intervals')
  if (validationInterval) {
    clearInterval(validationInterval)
    validationInterval = null
  }
})

// Computed properties based on user progress
const activeQuest = computed(() => {
    return userProgress.value?.currentQuestIndex || 0
})

// Clear all storage data
const clearAllStorageData = () => {
    try {
        // Clear sessionStorage
        sessionStorage.removeItem('user')
        sessionStorage.removeItem('adminAuthenticated')
        
        // Clear localStorage (if any game data is stored there)
        localStorage.removeItem('user')
        localStorage.removeItem('teamData')
        localStorage.removeItem('gameData')
        
        console.log('All storage data cleared')
    } catch (error) {
        console.error('Error clearing storage:', error)
    }
}

// Validate userId format (basic validation)
const isValidUserId = (id) => {
    if (!id || typeof id !== 'string') return false
    // Basic validation - should be non-empty string without invalid characters
    if (id.trim().length === 0) return false
    if (id.includes('undefined') || id.includes('null')) return false
    // Could add more specific Firebase ID validation if needed
    return true
}

// Redirect to home with cleanup
const redirectToHomeWithCleanup = (message = 'Redirecting to home page...') => {
    clearAllStorageData()
    alert(message)
    router.push({ name: 'Home' })
}

const userQuestOrder = computed(() => {
    return userProgress.value?.order || []
})

const activeQuestId = computed(() => {
    if (!userQuestOrder.value || userQuestOrder.value.length === 0) {
        return null
    }
    
    return userQuestOrder.value[activeQuest.value]
})

const activeQuestData = computed(() => {
    if (!activeQuestId.value || !quests.value) {
        return null
    }
    return quests.value.find(item => item.id === activeQuestId.value)
})

// Check if game is started
const isGameStarted = computed(() => {
    return gameState.value?.isStarted === true
})

// Game status message
const gameStatusMessage = computed(() => {
    if (!gameState.value) {
        return "Loading game status..."
    }
    
    if (gameState.value.status === "waiting" || !gameState.value.isStarted) {
        return "Waiting for admin to start the game..."
    }
    
    if (gameState.value.status === "stopped") {
        return "Game has been stopped by admin."
    }
    
    return ""
})

// Get team name
const teamName = computed(() => {
    return userProgress.value?.userData?.name || 'Loading...'
})

// Quest progression
const isLastQuest = computed(() => {
    return activeQuest.value >= (userQuestOrder.value?.length - 1)
})

const questProgress = computed(() => {
    if (!userQuestOrder.value || userQuestOrder.value.length === 0) {
        return "0/0"
    }
    return `${activeQuest.value + 1}/${userQuestOrder.value.length}`
})

const handleNextQuestion = async () => {
    if (isLastQuest.value) {
        // User completed all questions - show finish screen
        console.log('All quests completed, showing finish screen')
        allQuestsCompleted.value = true
        
        // Update user progress to mark as completed
        try {
            await updateUserProgress(userId.value, userQuestOrder.value.length)
        } catch (error) {
            console.error('Error marking completion:', error)
        }
        return
    }
    
    // Move to next question and update in Firebase
    const nextIndex = activeQuest.value + 1
    
    try {
        await updateUserProgress(userId.value, nextIndex)
        // The userProgress will be updated automatically via the Firebase listener
    } catch (error) {
        console.error('Error updating progress:', error)
        alert('Помилка при збереженні прогресу. Спробуйте ще раз.')
    }
}

// Watch for user deletion or non-existence (when userProgress becomes null)
watch(userProgress, (newProgress, oldProgress) => {
    console.log('User progress watch triggered:', { newProgress, oldProgress, userId: userId.value })
    
    if (newProgress === null && userId.value) {
        // User was deleted or doesn't exist
        console.log('User no longer exists, triggering cleanup and redirect')
        redirectToHomeWithCleanup('Your team has been removed by the administrator or no longer exists. You will be redirected to the home page.')
    }
}, { immediate: true })

</script>

<template>
    <div class="quests-page">
        <h1>{{ teamName }}</h1>
        
        <!-- Team Notification Component -->
        <TeamNotification v-if="userId" :teamId="userId" :isAdmin="false" />
        
        <!-- Game Status -->
        <div v-if="!isGameStarted" class="game-status-banner">
            <h2>{{ gameStatusMessage }}</h2>
            <p>Please wait for the game administrator to begin the session.</p>
        </div>
        
        <!-- Game Started - Show Quest Content -->
        <div v-else>
            <!-- All Quests Completed - Finish Screen -->
            <div v-if="allQuestsCompleted" class="finish-screen">
                <div class="finish-content">
                    <div class="finish-icon">🎉</div>
                    <h2 class="finish-title">Урра, ви пройшли усі випробування!</h2>
                    <p class="finish-message">Повертайтесь до місця проведення табору!</p>
                    <div class="finish-stats">
                        <div class="stat-item">
                            <span class="stat-label">Команда:</span>
                            <span class="stat-value">{{ teamName }}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Пройдено питань:</span>
                            <span class="stat-value">{{ userQuestOrder?.length || 0 }}</span>
                        </div>
                    </div>
                    <div class="finish-decoration">
                        <span class="trophy">🏆</span>
                        <span class="star">⭐</span>
                        <span class="trophy">🏆</span>
                    </div>
                </div>
            </div>
            
            <!-- Quest Content (when not completed) -->
            <div v-else>
                <!-- Progress indicator -->
                <div v-if="userQuestOrder && userQuestOrder.length > 0" class="progress-bar">
                    <div class="progress-info">
                        <span class="progress-text">Питання {{ questProgress }}</span>
                        <div class="progress-visual">
                            <div 
                                class="progress-fill" 
                                :style="{ width: `${((activeQuest + 1) / userQuestOrder.length) * 100}%` }"
                            ></div>
                        </div>
                    </div>
                </div>
                
                <!-- Loading state -->
                <div v-if="!activeQuestData && (!userQuestOrder || userQuestOrder.length === 0)" class="loading">
                    <p>Loading your quest...</p>
                </div>
                
                <!-- No quests available -->
                <div v-else-if="!activeQuestData && userQuestOrder && userQuestOrder.length === 0" class="no-quests">
                    <p>No quests available yet. Please check with the admin.</p>
                </div>
                
                <!-- Quest component -->
                <VQuest 
                    v-else-if="activeQuestData" 
                    :quest="activeQuestData" 
                    @next-question="handleNextQuestion"
                />
                
                <!-- Last question indicator -->
                <div v-if="isLastQuest && activeQuestData" class="completion-info">
                    <p class="completion-text">🏆 Це останнє питання!</p>
                </div>
                
                <!-- Error state -->
                <div v-else-if="!activeQuestData" class="error">
                    <p>Unable to load quest. Please try refreshing the page.</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.quests-page {
    max-width: 100%;
    margin: 0 auto;
    padding: 16px;
    min-height: 100vh;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.quests-page h1 {
    font-size: 24px;
    font-weight: 700;
    color: #212529;
    text-align: center;
    margin: 0 0 24px 0;
    padding: 16px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.game-status-banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
    padding: 32px 20px;
    border-radius: 20px;
    margin: 0 0 24px 0;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.game-status-banner h2 {
    margin: 0 0 12px 0;
    font-size: 22px;
    font-weight: 600;
}

.game-status-banner p {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
    line-height: 1.5;
}

.progress-bar {
    background: white;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.progress-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.progress-text {
    font-weight: 600;
    color: #495057;
    font-size: 18px;
    text-align: center;
}

.progress-visual {
    width: 100%;
    height: 12px;
    background-color: #e9ecef;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
    transition: width 0.5s ease;
    border-radius: 6px;
}

.completion-info {
    margin-top: 24px;
    padding: 20px;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(255, 243, 205, 0.4);
}

.completion-text {
    margin: 0;
    font-weight: 700;
    color: #856404;
    font-size: 18px;
}

.loading, .no-quests, .error {
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
    font-size: 16px;
    background: white;
    border-radius: 16px;
    margin: 24px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error {
    color: #dc3545;
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
}

/* Finish Screen Styles */
.finish-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    padding: 40px 20px;
}

.finish-content {
    text-align: center;
    max-width: 600px;
    width: 100%;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(40, 167, 69, 0.3);
    animation: finishAppear 0.8s ease-out;
}

@keyframes finishAppear {
    from {
        opacity: 0;
        transform: translateY(50px) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.finish-icon {
    font-size: 80px;
    margin-bottom: 20px;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-20px);
    }
    60% {
        transform: translateY(-10px);
    }
}

.finish-title {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 16px 0;
    color: white !important;
    line-height: 1.2;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.finish-message {
    font-size: 20px;
    font-weight: 500;
    margin: 0 0 30px 0;
    color: rgba(255, 255, 255, 0.95) !important;
    line-height: 1.4;
}

.finish-stats {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    backdrop-filter: blur(10px);
}

.stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 8px 0;
    font-size: 16px;
}

.stat-label {
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9) !important;
}

.stat-value {
    font-weight: 700;
    color: white !important;
    font-size: 18px;
}

.finish-decoration {
    margin-top: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
}

.trophy, .star {
    font-size: 40px;
    animation: pulse 2s infinite;
}

.star {
    animation-delay: 0.5s;
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
    100% {
        transform: scale(1);
    }
}

/* Mobile optimizations */
@media (max-width: 768px) {
    .quests-page {
        padding: 12px;
    }
    
    .quests-page h1 {
        font-size: 20px;
        padding: 12px;
        margin-bottom: 20px;
    }
    
    .game-status-banner {
        padding: 24px 16px;
        border-radius: 16px;
        margin-bottom: 20px;
    }
    
    .game-status-banner h2 {
        font-size: 20px;
        margin-bottom: 10px;
    }
    
    .game-status-banner p {
        font-size: 15px;
    }
    
    .progress-bar {
        padding: 16px;
        margin-bottom: 20px;
        border-radius: 12px;
    }
    
    .progress-text {
        font-size: 16px;
    }
    
    .progress-visual {
        height: 10px;
    }
    
    .completion-info {
        padding: 16px;
        margin-top: 20px;
        border-radius: 12px;
    }
    
    .completion-text {
        font-size: 16px;
    }
    
    .loading, .no-quests, .error {
        padding: 40px 16px;
        margin: 20px 0;
        border-radius: 12px;
        font-size: 15px;
    }
    
    /* Finish screen mobile styles */
    .finish-screen {
        min-height: 50vh;
        padding: 20px 10px;
    }
    
    .finish-content {
        padding: 30px 20px;
        border-radius: 16px;
    }
    
    .finish-icon {
        font-size: 60px;
        margin-bottom: 16px;
    }
    
    .finish-title {
        font-size: 24px;
        margin-bottom: 12px;
    }
    
    .finish-message {
        font-size: 18px;
        margin-bottom: 24px;
    }
    
    .finish-stats {
        padding: 16px;
        margin: 16px 0;
    }
    
    .stat-item {
        font-size: 15px;
        margin: 6px 0;
    }
    
    .stat-value {
        font-size: 16px;
    }
    
    .finish-decoration {
        margin-top: 24px;
        gap: 16px;
    }
    
    .trophy, .star {
        font-size: 32px;
    }
}

/* Very small screens */
@media (max-width: 360px) {
    .quests-page {
        padding: 8px;
    }
    
    .quests-page h1 {
        font-size: 18px;
        padding: 10px;
    }
    
    .game-status-banner {
        padding: 20px 12px;
    }
    
    .game-status-banner h2 {
        font-size: 18px;
    }
    
    .progress-bar {
        padding: 12px;
    }
    
    .completion-info {
        padding: 12px;
    }
    
    .loading, .no-quests, .error {
        padding: 30px 12px;
    }
}

/* Landscape orientation adjustments */
@media (max-height: 500px) and (orientation: landscape) {
    .quests-page {
        padding: 8px;
        min-height: auto;
    }
    
    .quests-page h1 {
        margin-bottom: 16px;
        padding: 8px 16px;
        font-size: 18px;
    }
    
    .game-status-banner {
        padding: 20px 16px;
        margin-bottom: 16px;
    }
    
    .progress-bar {
        padding: 12px 16px;
        margin-bottom: 16px;
    }
    
    .completion-info {
        margin-top: 16px;
        padding: 12px 16px;
    }
    
    .loading, .no-quests, .error {
        padding: 30px 16px;
        margin: 16px 0;
    }
}
</style>