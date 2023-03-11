<script setup>
import { ref } from 'vue';

const props = defineProps({
    quest: {
        id: 1,
        question: '',
        answers: [],
        qr: ''
    }
})

const answer = ref('')
const questionCompleted = ref(false)
const questCompleted = ref(false)

const checkAnswer = () => {
    if (props.quest?.answers.includes(answer.value)) {
        questionCompleted.value = true
    } else {
        console.log('wrong!')
    }
}

</script>

<template>
    <form @submit.prevent="checkAnswer()">
        <h3>{{ quest.question }}</h3>
        <input type="text" v-model="answer">
        <button>Відповісти</button>
        <div v-if="questionCompleted">Вірно!</div>
    </form>
    
    <div v-if="questionCompleted" class="map">
        <img :src="'/map-' + quest.id + '.jpg'" alt="">
    </div>

</template>

<style lang="scss">
.map {
    img {
        max-width: 100%;
        margin-top: 20px;
    }
}
</style>