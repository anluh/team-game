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
  
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;