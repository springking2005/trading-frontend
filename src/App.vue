<template>
  <div>
    <nav v-if="$route.path !== '/login'" id="navbar">
      <span id="nav-title">Trading Platform</span>
      <div id="nav-links">
        <router-link to="/dashboard">Dashboard</router-link>
        <router-link to="/order">Quick Order</router-link>
        <router-link to="/strategies">Strategies</router-link>
        <router-link to="/settings">Settings</router-link>
      </div>
    </nav>
    <main id="main-content">
      <router-view />
    </main>
  </div>
</template>
