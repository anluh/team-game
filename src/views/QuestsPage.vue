<script setup>
import { getGeneralSettings, getQuests, getUserProgress, updateUserProgress, getGameState } from '../firebase'
import { ref, computed, onMounted, watch } from 'vue';
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
  
  // Redirect if no user found
  if (!userId.value) {
    router.push({ name: 'Home' })
    return
  }
  
  // Get user progress (including quest order and current question index)
  const progressRef = getUserProgress(userId.value)
  
  // Watch the Firebase ref and update our local ref
  watch(progressRef, (newValue) => {
    userProgress.value = newValue || {
      currentQuestIndex: 0,
      order: [],
      userData: null
    }
  }, { immediate: true })
})

// Computed properties based on user progress
const activeQuest = computed(() => {
    return userProgress.value?.currentQuestIndex || 0
})

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
        // User completed all questions
        alert('Вітаємо! Ви пройшли всі питання!')
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

// Watch for user deletion (when userProgress becomes null)
watch(userProgress, (newProgress) => {
    if (newProgress === null) {
        alert('Your team has been removed by the administrator. You will be redirected to the home page.')
        router.push({ name: 'Home' })
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
            
            <!-- Completion state -->
            <div v-if="isLastQuest && activeQuestData" class="completion-info">
                <p class="completion-text">🏆 Це останнє питання!</p>
            </div>
            
            <!-- Error state -->
            <div v-else-if="!activeQuestData" class="error">
                <p>Unable to load quest. Please try refreshing the page.</p>
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

/* Mobile-specific optimizations */
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