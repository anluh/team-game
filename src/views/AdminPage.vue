<script setup>
import { useLoadUsers } from "../firebase"

const users = useLoadUsers()
</script>

<template>
  <div>
    <h1>Admin Page</h1>

    <div v-for="user in users">
      <span>Team Name</span>: <span>{{ user.name }}</span>
    </div>
  </div>
</template>

<style scoped>

</style>
