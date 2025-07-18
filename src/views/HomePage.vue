<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { createUser, generateOrderForNewUser } from '../firebase'

const router = useRouter();

// The router navigation guard will handle automatic redirects,
// so we don't need the redirect logic here anymore

const user = reactive({ 
  name: '', 
  order: [],
  finished_tasks: []
})

const onSubmit = async () => {
  try {
    // Generate unique order for this new user
    user.order = await generateOrderForNewUser()
    
    // Create user - this will automatically generate an ID and store it in sessionStorage
    await createUser({ ...user })
    
    // Get the generated user ID from sessionStorage (set by createUser function)
    const userId = window.sessionStorage.getItem('user')
    
    // Redirect to their specific questions page using the generated ID
    router.push({ name: 'QuestsWithUser', params: { userId } })
  } catch (error) {
    console.error('Error creating user:', error)
    alert('Error creating user. Please try again.')
  }
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
