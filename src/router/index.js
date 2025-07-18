import { createWebHistory, createRouter } from "vue-router";
import Home from "@/views/HomePage.vue";
import Quests from "@/views/QuestsPage.vue";
import Admin from "@/views/AdminPage.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/admin",
    name: "Admin",
    component: Admin,
  },
  {
    path: "/quests",
    name: "Quests",
    component: Quests,
  },
  {
    path: "/quests/:userId",
    name: "QuestsWithUser",
    component: Quests,
    props: true
  },
  
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard to redirect to user's questions page if user is already set
router.beforeEach((to, from, next) => {
  const userId = window.sessionStorage.getItem('user');
  
  // If user exists and they're not already going to their questions page or admin page
  if (userId && 
      to.name !== 'QuestsWithUser' && 
      to.name !== 'Admin' && 
      to.params.userId !== userId) {
    
    // Redirect to their specific questions page
    // Note: If user was deleted, the QuestsPage will handle the cleanup and redirect
    next({ name: 'QuestsWithUser', params: { userId } });
  } else {
    next();
  }
});

export default router;