<script setup>
import { getGeneralSettings, getQuests, getUserQuestOrder } from '../firebase'
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import VQuest from '../components/VQuest.vue';

const router = useRouter();

const general = getGeneralSettings()
const quests = getQuests()

const userId = window.sessionStorage.getItem('user')

//Redirect if no user found
if (!userId) router.push({ name: 'Home' })

// Quests order
const activeQuest = ref(0)
const order = getUserQuestOrder(userId);

const activeQuestId = computed(() => {
    console.log(order.value[activeQuest.value])

    return order.value[activeQuest.value]
})

const activeQuestData = computed(() => {
    return quests.value.find(item => item.id == activeQuestId.value)
})

</script>

<template>
    <h1>Quests page</h1>

    <VQuest v-if="activeQuestData" :quest="activeQuestData" />
</template>