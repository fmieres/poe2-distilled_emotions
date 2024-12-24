function refreshTableTooltips() {
  Vue.nextTick(function() {
    $('td.oils img').tooltip('dispose')
    $('td.oils img').tooltip()
  })
}

const app = new Vue({
  el: '#app',
  data: {
    oils: [
      { name: 'Clear Oil', level: 1 },
      { name: 'Sepia Oil', level: 10 },
      { name: 'Amber Oil', level: 19 },
      { name: 'Verdant Oil', level: 27 },
      { name: 'Teal Oil', level: 36 },
      { name: 'Azure Oil', level: 44 },
      { name: 'Indigo Oil', level: 48 },
      { name: 'Violet Oil', level: 52 },
      { name: 'Crimson Oil', level: 60 },
      { name: 'Black Oil', level: 68 },
      { name: 'Opalescent Oil', level: 73 },
      { name: 'Silver Oil', level: 78 },
      { name: 'Golden Oil', level: 80 },
      { name: 'Prismatic Oil', level: 80 },
    ],
    passives2: [],
    distilledEmotions: [],
    distilledEmotionsLoaded: {},
    combo: [],
    type: 'amulet',
    passives: {},
    enchantments: {},
    towers: {},
    maps: {},
    search: '',
    myDistilled: {},
    myDistilledDefault : {},
    myOils: _.fill(Array(14), 0)
  },
  created: function () {
    const self = this

    $.getJSON(`vendor/currencies.json`, function (data) {
      self.distilledEmotionsLoaded = data
      self.distilledEmotions = Object.keys(data).reduce(
        (fx,x) => {
          fx.push({name:x, image: data[x].img })
          return fx
        } , [])
        self.myDistilled = Object.keys(data).reduce(
          (fx,x) => ({...fx, [x]:0 }) , {})
        self.myDistilledDefault = { ...self.myDistilled }
    })
    $.getJSON(`vendor/passives2.json`, function (data) {
      self.passives2 = Object.keys(data).reduce(
        (fx,x) => {
          fx.push({
            name:x, 
            combo: data[x].currencies.map(c=> ({name:c, image: self.distilledEmotionsLoaded[c].img })),
            description: data[x].mods.reduce((fx,x)=>fx + '<br/>' + x,'' ) })
          return fx
        } , [])
    })

    _.map(this.oils, function (oil, i) {
      oil.image = `img/oils/${oil.name.toLowerCase().replace(' ', '_')}.png`
      oil.value = 3 ** i
    })

    _.each(['passives', 'enchantments', 'maps'], function(type) {
      $.getJSON(`vendor/${type}.json`, function (data) {
        _.each(data, function(value, key) {
          const oilValue = parseInt(key)
          data[key]['value'] = oilValue
          if (type !== 'maps') {
            data[key]['combo'] = self.getAnointmentCombo(oilValue, type)
          }
        })

        self[type] = data

        if (type === 'passives') {
          Vue.nextTick(function() {
            $('td.oils img').tooltip()
          })
        }
      })
    })

    $.getJSON('vendor/towers.json', function (towers) {
      self.towers = towers
      Vue.nextTick(function() {
        $('.tower-select img').tooltip()
      })
    })
  },
  methods: {
    getAnointmentCombo: function(value, type) {
      var combo = []
      const maxOils = this.getMaxOilsByType(type)

      // Build up the oil combo by collecting the largest value oils usable
      while (value > 0) {
        const oil = _.maxBy(this.oils, function(oil) {
          // if (value - oil.value >= 0) {
          if (value - oil.value > 0 || (value - oil.value === 0 && (combo.length === maxOils - 1))) {
            return oil.value
          }
        })

        combo.push(oil)
        value -= oil.value
      }

      return combo
    },
    getMaxOilsByType: function(type) {
      if (type === 'ring' || type === 'enchantments') {
        return 2
      } else if (type === 'ravaged') {
        return 9
      } else {
        return 3
      }
    },
    isMapType: function() {
      return this.type === 'map' || this.type === 'ravaged'
    },
    addOil: function(oil) {
      if (this.combo.length < this.maxOils) {
        if (this.type === 'ravaged') {
          // Ensure an oil appears no more than 3 times in a ravaged combo
          quantity = _.countBy(this.combo, 'value')[oil.value] || 0
          if (quantity < 3) {
            this.combo.push(oil)
          }
        } else {
          this.combo.push(oil)
        }
      }
    },
    removeOil: function(index) {
      this.combo.splice(index, 1)
    },
    setType: function(type) {
      this.type = type
      this.search = ''
      this.combo = this.combo.slice(0, this.maxOils)
      $('.table-data').scrollTop(0)

      refreshTableTooltips()
    },
    reset: function() {
      this.search = ''
      this.combo = []
      this.myOils = _.fill(Array(14), 0)
      this.myDistilled = {...this.myDistilledDefault}
    }
  },
  computed: {
    anointment: function() {
      if (this.combo.length > 0 && this.isMapType()) {
        const anointments = this.anointments
        var mods = {}

        // Sum up the total values for each mod
        _.each(this.combo, function(oil) {
          const anointment = anointments[oil.value]

          if (mods[anointment.description]) {
            mods[anointment.description] += anointment.mod
          } else {
            mods[anointment.description] = anointment.mod
          }

          // Handle anointments with multiple modifiers
          if (_.has(anointment, 'mod2')) {
            if (mods[anointment.description2]) {
              mods[anointment.description2] += anointment.mod2
            } else {
              mods[anointment.description2] = anointment.mod2
            }
          }
        })

        // Add the implicit +6% pack size per oil
        const packSize = 'MOD% Monster pack size'
        mods[packSize] = this.combo.length * 6

        // Substitue the total mod values into the descriptions
        const description = _.map(mods, function(value, mod) {
          return `${mod.replace(/MOD\d?/, value)}`
        })

        return { "description": _.join(description, '<br>') }
      } else if (this.combo.length === this.maxOils) {
        const value = _.reduce(this.combo, function(sum, oil) {
          return sum + oil.value
        }, 0)

        return this.anointments[value]
      }
    },
    anointments: function() {
      if (this.type === 'amulet') {
        return this.passives
      } else if (this.type === 'ring') {
        return this.enchantments
      } else if (this.isMapType()) {
        return this.maps
      }
    },
    maxOils: function() {
      return this.getMaxOilsByType(this.type)
    },
    usableOils: function() {
      if (this.type === 'amulet') {
        return this.oils
      } else {
        return _.dropRight(this.oils, 1)
      }
    }
  },
  watch: {
    combo: function() {
      $('.oil-select img').tooltip('dispose')
      Vue.nextTick(function() {
        $('.oil-select img').tooltip()
      })
    }
  }
})

Vue.component('distilled-emotions-table', {
  props: ['passives', 'type', 'search', 'myDistilled'],
  data: function() {
    return { sortKey: null, sortOrder: 'asc' }
  },
  template: '#distilled-emotions-table',
  methods: {
    getAnointmentCombo: function(value) {
      value = parseInt(value)

      var combo = []
      const maxOils = this.$parent.maxOils

      // Build up the oil combination by collecting the largest value oils usable
      while (value > 0) {
        const oil = _.maxBy(this.$parent.oils, function(oil) {
          if (value - oil.value > 0 || (value - oil.value === 0 && (combo.length === maxOils - 1))) {
            return oil.value
          }
        })

        combo.push(oil)
        value -= oil.value
      }

      return combo
      
    },
    setCombo: function(anointment) {
      this.$parent.combo = [...anointment.combo]
    },
    formatDescription: function(anointment) {
      return anointment.description
    },
    sortBy: function(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortOrder = 'asc'
      }

      this.sortKey = key
    },
    sortHeader: function(key) {
      if (this.sortKey === key.toLowerCase()) {
        return `<u>${key}</u>${this.sortOrder === 'asc' ? "\u23F7" : "\u23F6"}`
      } else {
        return `<u>${key}</u>`
      }
    },
    flatMyDistilled: function(obj) {
      return Object.entries(obj).flatMap(([key, value]) => Array(parseInt(value)||0).fill(key));
    },
    hasSufficientElements: function(xs, ys) {
      const xsCopy = [...xs]
      return ys.every(item => {
        const index = xsCopy.indexOf(item)
        if (index !== -1) {
          xsCopy.splice(index, 1)
          return true
        }
        return false
      });
    }
  },
  computed: {
    searchResults: function() {
      const search = this.search.toLowerCase()
      const myDistilled = this.flatMyDistilled(this.myDistilled)
      const distilledCount = myDistilled.length
      var results = this.passives
      if (search !== '') {
        results = _.pickBy(results, function(passive) {
          return passive.name.toLowerCase().indexOf(search) > -1 ||
          passive.description.toLowerCase().indexOf(search) > -1
        })
      }
      
      console.log(myDistilled)
      if (distilledCount >= 3) {
        results = _.pickBy(results, passive => this.hasSufficientElements(
          myDistilled, passive.combo.map(x => x.name)) )
      }

      if (this.sortKey !== null) {
        const key = this.sortKey
        results = _.sortBy(_.values(results), function(result) { return result[key] })
        if (this.sortOrder === 'desc') {
          results = _.reverse(results)
        }
      }

      refreshTableTooltips()
      return results
    }
  }
})

$('[data-toggle="tooltip"]').tooltip()
