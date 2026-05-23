# PRD: 注册页面 Claude Design System 对齐

## Problem Statement

注册页面（Register.vue）缺少自定义样式，仅使用 Element Plus 默认组件样式，与登录页面（Login.vue）的 Claude Design System 视觉风格严重不一致。用户从登录页跳转到注册页时，会感受到明显的视觉断层——两个页面像是来自不同产品。此外，验证码按钮使用 `el-input` 的 `#append` 插槽，在窄屏幕上布局拥挤，视觉层次不清晰。

## Solution

将 Register.vue 的模板结构和样式完全对齐 Login.vue 的 Claude Design System，包括：品牌标识区、暖色调 parchment 背景、象牙白输入框、terracotta 主色调按钮、衬线字体品牌名等。验证码按钮改为独立并排布局（outlined 样式），与整体设计语言保持一致。

## User Stories

1. As a new user, I want the register page to look and feel identical to the login page, so that I perceive a cohesive brand experience when switching between auth pages.
2. As a new user, I want form inputs to have clear placeholder text and recognizable icons, so that I understand what each field expects without reading labels.
3. As a new user, I want the verification code button to be visually distinct from the main submit button, so that I don't accidentally submit before verifying my email.
4. As a new user, I want to see a countdown timer on the verification code button, so that I know when I can request a new code.
5. As a new user, I want real-time form validation feedback with clear error messages, so that I can correct mistakes before submitting.
6. As a new user, I want to be able to submit the form by pressing Enter, so that I don't have to move my hand to the mouse.
7. As a new user, I want a clear link to the login page if I already have an account, so that I can navigate there without using the browser back button.

## Implementation Decisions

### Design System Alignment

Register.vue now shares the exact same SCSS design tokens and component structure as Login.vue:

- **Card structure**: Replaced `<el-card>` with `<div class="auth-card">` — a white rounded card with border-cream shadow, 420px max-width, centered via flexbox on parchment background.
- **Brand header**: Added `<div class="card-header">` with Georgia serif "AInterview" heading and sans-serif tagline ("创建账号，开启智能面试之旅").
- **Form labels**: Removed `label-width="80px"` in favor of placeholder-only inputs with `hide-required-asterisk`, matching Login's cleaner aesthetic.
- **Icons**: Added `User`, `Message`, `Key`, `Lock` from `@element-plus/icons-vue` as prefix icons on all inputs.

### Color Palette

```
parchment:       #f5f4ed  (page background)
ivory:           #faf9f5  (input background)
near-black:      #141413  (primary text)
stone-gray:      #87867f  (secondary text, placeholders)
terracotta:      #c96442  (primary button, link color)
terracotta-hover:#b85a3b  (button hover)
border-cream:    #f0eee6  (card border, input border)
focus-blue:      #3898ec  (input focus ring)
```

### Verification Code Button Redesign

**Before**: Code button was an `el-input` `#append` slot — a standard Element Plus button glued to the right edge of the input.

**After**: Code button is a standalone outlined button in a flex row (`.code-row`) with the input:

- `width: 120px`, `flex-shrink: 0` — fixed width, won't collapse
- `border: 1.5px solid $terracotta`, transparent background — outlined style
- On hover (enabled): fills to solid terracotta with white text
- Disabled state: gray border, ivory background, `cursor: not-allowed`
- 60-second countdown shown as button text (`${countdown}秒后重发`)

### Form Validation

- Email: custom validator with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password: required + min 6 chars
- Code: required + exactly 6 chars
- Username: required
- All validation errors rendered in `#b53333` at 13px, sans-serif

### TypeScript / API Contract

Uses existing `registerApi` and `sendCodeApi` from `@/api/modules/auth` — no API changes needed.

```
interface RegisterData {
  username?: string
  email?: string
  password?: string
  code?: string
}
```

## Testing Decisions

### What makes a good test
Tests should verify user-visible behavior, not CSS implementation details. Focus on:
- Form renders all 4 fields (username, email, code, password) plus submit button
- Form validation triggers on blur with correct error messages
- Verification code button shows countdown after click and disables during countdown
- Successful registration redirects to `/login` after 1.5s
- Enter key submits the form

### Test prior art
No existing component tests in the codebase for auth views. A basic Vitest + Vue Test Utils setup would be needed.

## Out of Scope

- Responsive/mobile layout for Register page (Login page also lacks dedicated mobile styles — the old `theme/media/login.scss` references a deprecated `login-container` structure and needs a separate redesign)
- Adding new form fields (phone, avatar, etc.)
- Social/OAuth registration flow (GitHub, etc.)
- Password strength meter
- reCAPTCHA or anti-bot verification
- Server-side validation error message i18n

## Further Notes

- The old `theme/media/login.scss` references a legacy `login-container` / `login-left` / `login-right` class structure that no longer exists in either Login.vue or Register.vue. This file should be cleaned up or rewritten as a separate task.
- The Login and Register pages now share ~95% of their SCSS. If a third auth page is added (e.g., password reset), the shared styles should be extracted to a composable SCSS partial or a shared `<AuthCard>` wrapper component.
