function InputDialog(okay, cancel) {
  const dialog = $("<dialog></dialog>");
  const title = $("<label></label>");
  title.append("Title");
  dialog.append(title);
  dialog.addClass("container border z-100 bg-white");
  dialog.attr("open");
  return dialog;
}
