<script setup>
import { getGeneralSettings, getQuests, getUserProgress, updateUserProgress, getGameState } from '../firebase'
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import VQuest from '../components/VQuest.vue';

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
let userId = null

onMounted(() => {
  // First, check if userId is provided via route parameter
  if (props.userId) {
    userId = props.userId
    // Store in sessionStorage for this session
    window.sessionStorage.setItem('user', userId)
  } else {
    // Fall back to sessionStorage
    userId = window.sessionStorage.getItem('user')
  }
  
  // Redirect if no user found
  if (!userId) {
    router.push({ name: 'Home' })
    return
  }
  
  // Get user progress (including quest order and current question index)
  const progressRef = getUserProgress(userId)
  
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
        await updateUserProgress(userId, nextIndex)
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
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.game-status-banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
    padding: 40px 20px;
    border-radius: 12px;
    margin: 20px 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.game-status-banner h2 {
    margin: 0 0 10px 0;
    font-size: 1.8rem;
}

.game-status-banner p {
    margin: 0;
    font-size: 1.1rem;
    opacity: 0.9;
}

.progress-bar {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.progress-text {
    font-weight: bold;
    color: #495057;
    font-size: 16px;
}

.progress-visual {
    width: 100%;
    height: 8px;
    background-color: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
    transition: width 0.3s ease;
}

.completion-info {
    margin-top: 20px;
    padding: 15px;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border-radius: 8px;
    text-align: center;
}

.completion-text {
    margin: 0;
    font-weight: bold;
    color: #856404;
    font-size: 16px;
}

.loading, .no-quests, .error {
    text-align: center;
    padding: 40px;
    color: #6c757d;
}

.error {
    color: #dc3545;
}
</style>