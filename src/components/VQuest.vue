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

// Secret code verification
const secretCode = ref('')
const showSecretCodeInput = ref(false)
const showWrongSecretCode = ref(false)
const secretCodeCompleted = ref(false)

const checkAnswer = () => {
    if (props.quest?.answers) {
        // Convert user answer to lowercase and trim whitespace
        const userAnswer = answer.value.toLowerCase().trim()
        
        // Convert all stored answers to lowercase for comparison
        const correctAnswers = props.quest.answers.map(ans => ans.toLowerCase().trim())
        
        if (correctAnswers.includes(userAnswer)) {
            questionCompleted.value = true
            showWrongAnswer.value = false
            // Show secret code input after correct answer
            showSecretCodeInput.value = true
        } else {
            showWrongAnswer.value = true
            // Auto-hide wrong answer message after 3 seconds
            setTimeout(() => {
                showWrongAnswer.value = false
            }, 3000)
        }
    }
}

const checkSecretCode = () => {
    if (props.quest?.qr) {
        // Convert secret code to lowercase and trim for comparison
        const userSecretCode = secretCode.value.toLowerCase().trim()
        const correctSecretCode = props.quest.qr.toLowerCase().trim()
        
        if (userSecretCode === correctSecretCode) {
            secretCodeCompleted.value = true
            showWrongSecretCode.value = false
        } else {
            showWrongSecretCode.value = true
            // Auto-hide wrong secret code message after 3 seconds
            setTimeout(() => {
                showWrongSecretCode.value = false
            }, 3000)
        }
    }
}

const goToNextQuestion = () => {
    // Only proceed if both answer and secret code are correct
    if (questionCompleted.value && secretCodeCompleted.value) {
        emit('nextQuestion')
        
        // Reset all states for next question
        answer.value = ''
        secretCode.value = ''
        questionCompleted.value = false
        showSecretCodeInput.value = false
        secretCodeCompleted.value = false
        showWrongAnswer.value = false
        showWrongSecretCode.value = false
    }
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
            </div>
        </form>
        
        <div v-else class="no-quest">
            <p>No quest data available</p>
        </div>
        
        <!-- Success Image -->
        <div v-if="questionCompleted" class="map">
            <img 
                :src="`/${props.quest.imageName || 'map-1'}.jpg`" 
                :alt="`Success image: ${props.quest.imageName || 'map-1'}`"
                @click="openFullImage"
                class="success-image"
            >
            <p class="image-hint">Клікніть на зображення для повного перегляду</p>
        </div>
        
        <!-- Secret Code Section (after image) -->
        <div v-if="questionCompleted" class="secret-code-container">
            <!-- Secret Code Input Section -->
            <div v-if="showSecretCodeInput && !secretCodeCompleted" class="secret-code-section">
                <h4 class="secret-code-title">🔐 Секретний код</h4>
                <p class="secret-code-description">Для переходу до наступного питання:</p>
                
                <form @submit.prevent="checkSecretCode()" class="secret-code-form">
                    <input 
                        type="text" 
                        v-model="secretCode" 
                        placeholder="Введіть секретний код..."
                        class="secret-code-input"
                        autocomplete="off"
                    >
                    <button 
                        type="submit"
                        :disabled="!secretCode.trim()"
                        class="verify-code-btn"
                    >
                        🔍 Перевірити код
                    </button>
                </form>
                
                <!-- Wrong Secret Code Message -->
                <div v-if="showWrongSecretCode" class="wrong-secret-code-message">
                    <div class="wrong-icon">❌</div>
                    <div class="wrong-text">
                        <strong>Неправильний код</strong>
                        <p>Перевірте QR-код і спробуйте ще раз!</p>
                    </div>
                </div>
            </div>
            
            <!-- Secret Code Success -->
            <div v-if="secretCodeCompleted" class="secret-code-success">
                <div class="code-success-message">
                    🎉 Код підтверджено!
                </div>
            </div>
            
            <!-- Next Question Button -->
            <div class="next-question-container">
                <button 
                    @click="goToNextQuestion"
                    class="next-btn"
                    type="button"
                    :disabled="!secretCodeCompleted"
                    :class="{ 'disabled': !secretCodeCompleted }"
                >
                    {{ secretCodeCompleted ? 'Наступне питання →' : 'Знайдіть місце, виконайте завдання та введіть секретний код' }}
                </button>
            </div>
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

/* Secret Code Container - Better UX Flow */
.secret-code-container {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* Secret Code Section Styles */
.secret-code-section {
    padding: 20px;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border-radius: 12px;
    border-left: 4px solid #ffc107;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.1);
}

.secret-code-title {
    color: #856404 !important;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    text-align: center;
}

.secret-code-description {
    color: #856404 !important;
    font-size: 14px;
    margin: 0 0 16px 0;
    line-height: 1.5;
    text-align: center;
}

.secret-code-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.secret-code-input {
    padding: 14px 18px;
    font-size: 16px;
    width: 100%;
    border: 2px solid #ffc107;
    border-radius: 10px;
    transition: all 0.2s;
    box-sizing: border-box;
    color: #212529 !important;
    background-color: #fff;
    text-align: center;
    font-weight: 500;
}

.secret-code-input:focus {
    outline: none;
    border-color: #ff9500;
    box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.2);
    transform: scale(1.02);
}

.verify-code-btn {
    padding: 14px 24px;
    font-size: 15px;
    font-weight: 600;
    background: linear-gradient(135deg, #ffc107 0%, #ff9500 100%);
    color: #212529 !important;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
    box-shadow: 0 2px 6px rgba(255, 193, 7, 0.3);
}

.verify-code-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #ff9500 0%, #e8890b 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4);
}

.verify-code-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 6px rgba(255, 193, 7, 0.2);
}

.wrong-secret-code-message {
    margin-top: 12px;
    padding: 12px;
    background: linear-gradient(135deg, #f8d7da 0%, #f1c2c7 100%);
    border-radius: 8px;
    border-left: 4px solid #dc3545;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: shake 0.5s ease-in-out;
}

.secret-code-success {
    padding: 20px;
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    border-radius: 12px;
    border-left: 4px solid #28a745;
    text-align: center;
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.1);
}

.code-success-message {
    color: #155724 !important;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
}

/* Next Question Button Container */
.next-question-container {
    display: flex;
    justify-content: center;
    margin-top: 8px;
}

.next-btn {
    padding: 16px 32px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white !important;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
    min-height: 56px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
}

.next-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #218838 0%, #1bc5a0 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(40, 167, 69, 0.3);
}

.next-btn.disabled {
    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%) !important;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: 0 2px 6px rgba(108, 117, 125, 0.2) !important;
    font-size: 14px;
    opacity: 0.8;
}

/* Map and No Quest Styles */
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
    margin-top: 20px;
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.success-image {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.success-image:hover {
    transform: scale(1.02);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
}

.image-hint {
    margin-top: 12px;
    font-size: 14px;
    color: #6c757d;
    font-style: italic;
}

/* Mobile optimizations for secret code */
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
    
    .secret-code-section {
        margin-top: 16px;
        padding: 16px;
    }
    
    .secret-code-title {
        font-size: 16px;
    }
    
    .secret-code-description {
        font-size: 13px;
        margin: 0 0 12px 0;
    }
    
    .secret-code-input {
        padding: 12px 16px;
        font-size: 15px;
    }
    
    .verify-code-btn {
        padding: 12px 20px;
        font-size: 14px;
        min-height: 44px;
    }
    
    .code-success-message {
        font-size: 16px;
    }
    
    .secret-code-container {
        margin-top: 16px;
        gap: 16px;
    }
    
    .map {
        margin-top: 16px;
        padding: 16px;
    }
    
    .next-btn {
        padding: 14px 24px;
        font-size: 15px;
        min-height: 48px;
    }
    
    .next-btn.disabled {
        font-size: 13px;
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