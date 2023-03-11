<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { createUser, getQuests } from '../firebase'

const router = useRouter();
const quests = getQuests()

if (window.sessionStorage.getItem('user')) router.push({ name: 'Quests' })

const user = reactive({ 
  name: '', 
  order: [],
  finished_tasks: []
})

const onSubmit = async () => {
  user.order = quests.value.map(item => parseInt(item.id))
  await createUser({ ...user })
  router.push({ name: 'Quests' })
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <div class="form-group">
      <label>Назва Команди</label>
      <input type="text" v-model="user.name" required />
    </div>

    <button>Поїхали...</button>
  </form>
</template>

<style scoped></style>
