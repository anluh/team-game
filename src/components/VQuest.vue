<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
    quest: {
        type: Object,
        default: () => ({
            id: '',
            question: '',
            answers: [],
            qr: '',
            imageName: 'map-1'
        })
    }
})

// Define emits
const emit = defineEmits(['nextQuestion'])

const answer = ref('')
const questionCompleted = ref(false)
const questCompleted = ref(false)
const showWrongAnswer = ref(false)
const showFullImage = ref(false)

const checkAnswer = () => {
    if (props.quest?.answers && props.quest.answers.includes(answer.value)) {
        questionCompleted.value = true
        showWrongAnswer.value = false
    } else {
        showWrongAnswer.value = true
        // Auto-hide wrong answer message after 3 seconds
        setTimeout(() => {
            showWrongAnswer.value = false
        }, 3000)
    }
}

const goToNextQuestion = () => {
    emit('nextQuestion')
    // Reset for next question
    answer.value = ''
    questionCompleted.value = false
    showWrongAnswer.value = false
}

const openFullImage = () => {
    showFullImage.value = true
}

const closeFullImage = () => {
    showFullImage.value = false
}

// Handle ESC key to close modal
const handleKeydown = (event) => {
    if (event.key === 'Escape' && showFullImage.value) {
        closeFullImage()
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
})

</script>

<template>
    <div class="quest-container">
        <form @submit.prevent="checkAnswer()" v-if="props.quest?.question">
            <h3>{{ props.quest.question }}</h3>
            <input 
                type="text" 
                v-model="answer" 
                placeholder="Введіть вашу відповідь..."
                :disabled="questionCompleted"
                class="answer-input"
            >
            <button 
                type="submit"
                :disabled="questionCompleted"
                class="submit-btn"
            >
                Відповісти
            </button>
            
            <!-- Wrong Answer Message -->
            <div v-if="showWrongAnswer" class="wrong-answer-message">
                <div class="wrong-icon">❌</div>
                <div class="wrong-text">
                    <strong>Неправильна відповідь</strong>
                    <p>Спробуйте ще раз!</p>
                </div>
            </div>
            
            <div v-if="questionCompleted" class="success-section">
                <div class="success-message">
                    ✅ Вірно!
                </div>
                
                <button 
                    @click="goToNextQuestion"
                    class="next-btn"
                    type="button"
                >
                    Наступне питання →
                </button>
            </div>
        </form>
        
        <div v-else class="no-quest">
            <p>No quest data available</p>
        </div>
        
        <div v-if="questionCompleted" class="map">
            <img 
                :src="`/${props.quest.imageName || 'map-1'}.jpg`" 
                :alt="`Success image: ${props.quest.imageName || 'map-1'}`"
                @click="openFullImage"
                class="success-image"
            >
            <p class="image-hint">Клікніть на зображення для повного перегляду</p>
        </div>
        
        <!-- Full-page Image Modal -->
        <div v-if="showFullImage" class="image-modal" @click="closeFullImage">
            <div class="modal-content" @click.stop>
                <button class="close-modal" @click="closeFullImage">&times;</button>
                <img 
                    :src="`/${props.quest.imageName || 'map-1'}.jpg`" 
                    :alt="`Success image: ${props.quest.imageName || 'map-1'}`"
                    class="full-image"
                >
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.quest-container {
    max-width: 100%;
    margin: 0 auto;
    padding: 16px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    color: #212529 !important;
}

.quest-container h3 {
    color: #212529 !important;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 20px;
    line-height: 1.4;
}

.quest-container * {
    color: inherit;
}

.answer-input {
    padding: 16px 20px;
    font-size: 18px;
    width: 100%;
    margin: 20px 0;
    border: 2px solid #ddd;
    border-radius: 12px;
    transition: border-color 0.2s;
    box-sizing: border-box;
    color: #212529 !important;
    background-color: #fff;
    
    &:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
    }
    
    &:disabled {
        background-color: #f8f9fa;
        color: #6c757d !important;
        border-color: #e9ecef;
    }
    
    &::placeholder {
        font-size: 16px;
        color: #6c757d !important;
    }
}

.submit-btn {
    padding: 16px 24px;
    font-size: 18px;
    font-weight: 600;
    background-color: #007bff;
    color: white !important;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    min-height: 56px; // Minimum touch target size
    
    &:hover:not(:disabled) {
        background-color: #0056b3;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }
    
    &:active {
        transform: translateY(0);
    }
    
    &:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
        color: white !important;
    }
}

.success-section {
    margin-top: 24px;
    padding: 24px;
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.success-message {
    color: #155724 !important;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 16px;
}

.next-btn {
    background-color: #28a745;
    color: white !important;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
    
    &:hover {
        background-color: #218838;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }
}

.no-quest {
    padding: 40px 20px;
    text-align: center;
    color: #666;
    font-size: 16px;
}

.no-quest p {
    color: #212529 !important;
    font-size: 18px;
    text-align: center;
    margin-top: 40px;
}

.map {
    margin-top: 24px;
    text-align: center;
    flex: 1;
}

/* Wrong Answer Message - Mobile Optimized */
.wrong-answer-message {
    margin-top: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #f8d7da 0%, #f1c2c7 100%);
    border-radius: 12px;
    border-left: 4px solid #dc3545;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: shake 0.5s ease-in-out;
}

.wrong-icon {
    font-size: 28px;
    flex-shrink: 0;
}

.wrong-text {
    flex: 1;
}

.wrong-text strong {
    color: #721c24 !important;
    font-size: 16px;
    margin-bottom: 4px;
}

.wrong-text p {
    color: #721c24 !important;
    margin: 0;
    font-size: 14px;
}

@keyframes shake {
    0%, 20%, 50%, 80%, 100% { transform: translateX(0); }
    10%, 30%, 70%, 90% { transform: translateX(-8px); }
    40%, 60% { transform: translateX(8px); }
}

/* Success Image - Mobile Optimized */
.success-image {
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    height: auto;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    
    &:hover, &:active {
        transform: scale(1.02);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
}

.image-hint {
    text-align: center;
    margin-top: 12px;
    font-size: 14px;
    color: #6c757d;
    font-style: italic;
    padding: 8px 16px;
    background: rgba(108, 117, 125, 0.1);
    border-radius: 20px;
    display: inline-block;
}

/* Full-page Image Modal - Mobile Optimized */
.image-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    cursor: pointer;
    padding: 20px;
    box-sizing: border-box;
}

.modal-content {
    position: relative;
    max-width: 100%;
    max-height: 100%;
    cursor: default;
    display: flex;
    justify-content: center;
    align-items: center;
}

.close-modal {
    position: absolute;
    top: -60px;
    right: 0;
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 1001;
    transition: all 0.3s ease;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    
    &:hover, &:active {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
        border-color: rgba(255, 255, 255, 0.5);
    }
}

.full-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

/* Mobile-specific adjustments */
@media (max-width: 768px) {
    .quest-container {
        padding: 12px;
    }
    
    .answer-input {
        font-size: 16px; // Prevents zoom on iOS
        padding: 18px 20px;
        margin: 16px 0;
    }
    
    .submit-btn, .next-btn {
        min-height: 60px; // Larger touch targets on mobile
        font-size: 18px;
    }
    
    .success-section {
        padding: 20px 16px;
        margin-top: 20px;
    }
    
    .wrong-answer-message {
        padding: 16px;
        gap: 12px;
    }
    
    .wrong-icon {
        font-size: 24px;
    }
    
    .wrong-text strong {
        font-size: 16px;
    }
    
    .wrong-text p {
        font-size: 14px;
    }
    
    .close-modal {
        top: -50px;
        width: 44px;
        height: 44px;
        font-size: 20px;
    }
    
    .image-hint {
        font-size: 12px;
        padding: 6px 12px;
    }
}

/* Very small screens */
@media (max-width: 360px) {
    .quest-container {
        padding: 8px;
    }
    
    .answer-input {
        padding: 16px;
        margin: 12px 0;
    }
    
    .success-section {
        padding: 16px 12px;
    }
    
    .wrong-answer-message {
        padding: 12px;
        flex-direction: column;
        text-align: center;
    }
    
    .wrong-icon {
        font-size: 32px;
    }
}

/* Landscape orientation on phones */
@media (max-height: 500px) and (orientation: landscape) {
    .quest-container {
        min-height: auto;
        padding: 8px;
    }
    
    .success-section {
        margin-top: 16px;
        padding: 16px;
    }
    
    .map {
        margin-top: 16px;
    }
    
    .success-image {
        max-width: 300px;
        max-height: 200px;
    }
}
</style>