function ListView(layoutId, onScrollListener) {
  this.layoutId = layoutId;
  this.items = [];
  this.visibleItems = [];
  var timer = null;
  $(window).scroll(() => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      this.updateVisibleItems();
      if (onScrollListener) onScrollListener(this.visibleItems);
    }, 1000);
  });
}

ListView.prototype = {
  updateVisibleItems: function () {
    this.visibleItems.splice(0, this.visibleItems.length);
    if (this.items.length > 0) {
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        if (this.isVisible(item.id)) this.visibleItems.push(item);
      }
    }
    return this.visibleItems;
  },
  setItems: function (items) {
    this.items = items;
  },

  addItem: function (item) {
    this.items.push(item);
  },

  removeItem: function (index) {
    this.items.splice(index, 1);
  },

  isVisible: function (id) {
    const element = $(`#${id}`);
    if (!element) return false;
    var elementTop = element.offset().top;
    var elementBottom = elementTop + element.outerHeight();
    var viewportTop = $(window).scrollTop();
    var viewportBottom = viewportTop + $(window).height();
    return elementBottom > viewportTop && elementTop < viewportBottom;
  },

  init: function (content) {
    $(`#${this.layoutId}`).empty();
    this.items.forEach((file, index) => {
      file.index = index;
      file.id = this.generateId();
      $(`#${this.layoutId}`).append(content(file));
    });
  },

  generateId: function () {
    return `id_${(Math.random(8) + 1).toString().substr(2, 7)}`;
  },
};
