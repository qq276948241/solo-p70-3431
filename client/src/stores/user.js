import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('groupbuy_token') || '')
  const leader = ref(JSON.parse(localStorage.getItem('groupbuy_leader') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const leaderName = computed(() => leader.value?.real_name || leader.value?.username || '')

  async function login(username, password) {
    const res = await authApi.login({ username, password })
    token.value = res.data.token
    leader.value = res.data.leader
    localStorage.setItem('groupbuy_token', res.data.token)
    localStorage.setItem('groupbuy_leader', JSON.stringify(res.data.leader))
    return res.data
  }

  async function register(data) {
    return await authApi.register(data)
  }

  function logout() {
    token.value = ''
    leader.value = null
    localStorage.removeItem('groupbuy_token')
    localStorage.removeItem('groupbuy_leader')
  }

  return {
    token,
    leader,
    isLoggedIn,
    leaderName,
    login,
    register,
    logout
  }
})
