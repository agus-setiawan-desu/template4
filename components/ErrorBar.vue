<template>
  <transition name="slide" type="animation">
    <div v-if="error" class="notification is-danger">
      {{ error.message }}
    </div>
  </transition>
</template>

<script>
export default {
  props: ['error']
}
</script>

