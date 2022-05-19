<template>
    <div>
        <p>Context menu: context: {{ context.title }}</p>
    </div>
</template>

<script>
export default {
  name: 'TheAposContextTitle',
  props: {
    context: {
      type: Object,
      default() {
        return {};
      }
    }
  },
  created() {
      console.log(this.context)
  },
  /*
  extendMethods(self) {
      return {
          getBrowserData(_super, req) {
              console.log('super getBrowserData')
              const browserData = _super(req)
              browserData.context.version = -1
              return browserData
          }
      }
  }
  */
}
</script>