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

<style scoped>
form {
    max-width: 100%;
    margin: 0 auto;
    padding: 24px 16px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.form-group {
    width: 100%;
    max-width: 400px;
    margin-bottom: 32px;
    text-align: center;
}

.form-group label {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: white;
    margin-bottom: 16px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.form-group input {
    width: 100%;
    padding: 18px 20px;
    font-size: 18px;
    border: none;
    border-radius: 16px;
    background: white;
    color: #212529;
    text-align: center;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    box-sizing: border-box;
}

.form-group input:focus {
    outline: none;
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.form-group input::placeholder {
    color: #6c757d;
    font-weight: 400;
}

button {
    width: 100%;
    max-width: 400px;
    padding: 18px 32px;
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 64px;
    box-shadow: 0 8px 24px rgba(40, 167, 69, 0.4);
    text-transform: uppercase;
    letter-spacing: 1px;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(40, 167, 69, 0.5);
    background: linear-gradient(135deg, #218838 0%, #1bc5a0 100%);
}

button:active {
    transform: translateY(0);
    box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4);
}

/* Mobile optimizations */
@media (max-width: 768px) {
    form {
        padding: 20px 12px;
    }
    
    .form-group {
        margin-bottom: 28px;
    }
    
    .form-group label {
        font-size: 22px;
        margin-bottom: 14px;
    }
    
    .form-group input {
        padding: 16px 18px;
        font-size: 16px; /* Prevents zoom on iOS */
    }
    
    button {
        padding: 16px 28px;
        font-size: 18px;
        min-height: 60px;
    }
}

/* Very small screens */
@media (max-width: 360px) {
    form {
        padding: 16px 8px;
    }
    
    .form-group label {
        font-size: 20px;
        margin-bottom: 12px;
    }
    
    .form-group input {
        padding: 14px 16px;
    }
    
    button {
        font-size: 16px;
        letter-spacing: 0.5px;
    }
}

/* Landscape orientation adjustments */
@media (max-height: 500px) and (orientation: landscape) {
    form {
        padding: 16px 12px;
        min-height: auto;
        justify-content: flex-start;
        padding-top: 40px;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        font-size: 20px;
        margin-bottom: 10px;
    }
    
    .form-group input {
        padding: 14px 16px;
    }
    
    button {
        min-height: 50px;
        font-size: 16px;
    }
}
</style>
