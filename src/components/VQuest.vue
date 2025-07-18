<script setup>
import { ref } from 'vue';

const props = defineProps({
    quest: {
        type: Object,
        default: () => ({
            id: '',
            question: '',
            answers: [],
            qr: ''
        })
    }
})

// Define emits
const emit = defineEmits(['nextQuestion'])

const answer = ref('')
const questionCompleted = ref(false)
const questCompleted = ref(false)

const checkAnswer = () => {
    if (props.quest?.answers && props.quest.answers.includes(answer.value)) {
        questionCompleted.value = true
    } else {
        alert('Неправильна відповідь. Спробуйте ще раз!')
    }
}

const goToNextQuestion = () => {
    emit('nextQuestion')
    // Reset for next question
    answer.value = ''
    questionCompleted.value = false
}

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
            <img :src="'/map-' + props.quest.id + '.jpg'" alt="">
        </div>
    </div>
</template>

<style lang="scss">
.quest-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
}

.answer-input {
    padding: 12px;
    font-size: 16px;
    width: 300px;
    margin: 15px 10px 15px 0;
    border: 2px solid #ddd;
    border-radius: 6px;
    transition: border-color 0.2s;
    
    &:focus {
        outline: none;
        border-color: #007bff;
    }
    
    &:disabled {
        background-color: #f8f9fa;
        color: #6c757d;
        border-color: #e9ecef;
    }
}

.submit-btn {
    padding: 12px 20px;
    font-size: 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover:not(:disabled) {
        background-color: #0056b3;
    }
    
    &:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
    }
}

.success-section {
    margin-top: 20px;
    padding: 20px;
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    border-radius: 8px;
    text-align: center;
}

.success-message {
    color: #155724;
    font-weight: bold;
    font-size: 18px;
    margin-bottom: 15px;
}

.next-btn {
    padding: 12px 24px;
    font-size: 16px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
    
    &:hover {
        background-color: #218838;
    }
}

.no-quest {
    padding: 20px;
    text-align: center;
    color: #666;
}

.map {
    margin-top: 20px;
    text-align: center;
    
    img {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
}
</style>