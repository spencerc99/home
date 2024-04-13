export function showSnackbar(text) {
  // Get the snackbar DIV
  var x = document.getElementById("snackbar");

  // Add the "show" class to DIV
  x.className = "show";
  x.innerHTML = text;

  // After 3 seconds, remove the show class from DIV
  setTimeout(function () {
    x.className = x.className.replace("show", "");
  }, 2000);
}

export function showLinkCopiedSnackbar() {
  showSnackbar("Link copied to clipboard!");
}

export function copyLink(text) {
  navigator.clipboard.writeText(text);
  showLinkCopiedSnackbar();
  return undefined;
}

export function scrollUp(elementId) {
  document
    .querySelector(`#${elementId}`)
    ?.scrollIntoView({ behavior: "smooth" });
}
