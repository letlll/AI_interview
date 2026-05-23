<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="card-header">
        <h1 class="brand-name">AInterview</h1>
        <p class="brand-tagline">创建账号，开启智能面试之旅</p>
      </div>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        hide-required-asterisk
        @keyup.enter="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="邮箱地址"
            :prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item prop="code">
          <div class="code-row">
            <el-input
              v-model="registerForm.code"
              placeholder="6位验证码"
              :prefix-icon="Key"
              class="code-input"
            />
            <el-button
              @click="handleSendCode"
              :disabled="isSendingCode || countdown > 0"
              class="code-button"
            >
              {{ countdown > 0 ? `${countdown}秒后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            show-password
            placeholder="密码（至少6位）"
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            :loading="loading"
            @click="handleRegister"
            class="register-button"
            round
          >
            立即注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-footer">
        已有账号？ <router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Lock, Message, Key } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { registerApi, sendCodeApi } from '@/api/modules/auth'

const router = useRouter()
const registerFormRef = ref<FormInstance>()
const loading = ref(false)

const isSendingCode = ref(false)
const countdown = ref(0)
let timer: number | null = null

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  code: '',
})

const validateEmail = (_rule: any, value: any, callback: any) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!value) return callback(new Error('请输入邮箱地址'))
  if (!emailRegex.test(value)) return callback(new Error('请输入有效的邮箱地址'))
  callback()
}

const registerRules = reactive<FormRules>({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [{ validator: validateEmail, trigger: 'blur' }],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码必须是6位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
})

const handleSendCode = async () => {
  registerFormRef.value?.validateField('email', async (isValid) => {
    if (isValid) {
      isSendingCode.value = true
      try {
        await sendCodeApi(registerForm.email)
        ElMessage.success('验证码已发送，请注意查收！')
        countdown.value = 60
        timer = window.setInterval(() => {
          if (countdown.value > 0) {
            countdown.value--
          } else if (timer) {
            clearInterval(timer)
            timer = null
          }
        }, 1000)
      } catch (error) {
        console.error('发送验证码失败', error)
      } finally {
        isSendingCode.value = false
      }
    } else {
      ElMessage.warning('请先输入正确的邮箱地址')
    }
  })
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await registerApi(registerForm)
        ElMessage.success('注册成功！即将跳转到登录页...')
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } catch (error) {
        console.error('注册失败', error)
      } finally {
        loading.value = false
      }
    }
  })
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style lang="scss" scoped>
// ── Claude Design System: Register Page ──

$parchment: #f5f4ed;
$ivory: #faf9f5;
$near-black: #141413;
$olive-gray: #5e5d59;
$stone-gray: #87867f;
$charcoal-warm: #4d4c48;
$terracotta: #c96442;
$terracotta-hover: #b85a3b;
$border-cream: #f0eee6;
$border-warm: #e8e6dc;
$ring-warm: #d1cfc5;
$focus-blue: #3898ec;
$warm-sand: #e8e6dc;

$serif: 'Georgia', 'Times New Roman', serif;
$sans: 'Arial', 'Helvetica Neue', system-ui, sans-serif;

.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $parchment;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 16px;
  padding: 48px 40px 40px;
  box-shadow:
    0px 0px 0px 1px $border-cream,
    rgba(0, 0, 0, 0.04) 0px 4px 24px;
}

.card-header {
  text-align: center;
  margin-bottom: 40px;
}

.brand-name {
  font-family: $serif;
  font-size: 32px;
  font-weight: 500;
  line-height: 1.2;
  color: $near-black;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.brand-tagline {
  font-family: $sans;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: $stone-gray;
  margin: 0;
}

// ── Form overrides ──

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form-item__error) {
  font-family: $sans;
  font-size: 13px;
  color: #b53333;
  padding-top: 4px;
}

:deep(.el-input__wrapper) {
  background: $ivory;
  border-radius: 12px;
  padding: 4px 14px;
  box-shadow: 0px 0px 0px 1px $border-cream;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0px 0px 0px 1px $ring-warm;
  }

  &.is-focus {
    box-shadow: 0px 0px 0px 2px $focus-blue;
  }
}

:deep(.el-input__inner) {
  font-family: $sans;
  font-size: 16px;
  line-height: 1.6;
  color: $near-black;
  height: 44px;

  &::placeholder {
    color: $stone-gray;
    font-family: $sans;
    font-size: 15px;
  }
}

:deep(.el-input__prefix-inner) {
  color: $stone-gray;
  margin-right: 8px;
}

// ── Verification code row ──

.code-row {
  display: flex;
  gap: 10px;
}

.code-input {
  flex: 1;
}

.code-button {
  width: 120px;
  height: 44px;
  font-family: $sans;
  font-size: 13px;
  font-weight: 500;
  color: $terracotta;
  background: transparent;
  border: 1.5px solid $terracotta;
  border-radius: 12px;
  flex-shrink: 0;
  padding: 0 8px;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    color: #ffffff;
    background: $terracotta;
  }

  &:active:not(:disabled) {
    background: $terracotta-hover;
    border-color: $terracotta-hover;
    color: #ffffff;
  }

  &:disabled {
    color: $stone-gray;
    border-color: $border-warm;
    background: $ivory;
    cursor: not-allowed;
  }
}

// ── Register button ──

.register-button {
  width: 100%;
  height: 48px;
  font-family: $sans;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.25;
  color: $ivory;
  background: $terracotta;
  border: none;
  border-radius: 12px;
  box-shadow:
    0px 0px 0px 0px $terracotta,
    0px 0px 0px 1px $terracotta;
  margin-top: 4px;
  transition: background 0.15s ease, box-shadow 0.15s ease;

  &:hover,
  &:focus {
    background: $terracotta-hover;
    box-shadow:
      0px 0px 0px 0px $terracotta-hover,
      0px 0px 0px 1px $terracotta-hover;
    color: $ivory;
  }

  &:active {
    box-shadow: inset 0px 0px 0px 1px rgba(0, 0, 0, 0.15);
  }
}

:deep(.el-button.is-loading) {
  background: $terracotta;
  box-shadow:
    0px 0px 0px 0px $terracotta,
    0px 0px 0px 1px $terracotta;
}

// ── Footer ──

.auth-footer {
  text-align: center;
  margin-top: 28px;
  font-family: $sans;
  font-size: 15px;
  line-height: 1.6;
  color: $stone-gray;

  a {
    color: $terracotta;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
