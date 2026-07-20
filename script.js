const portfolioFiles = document.querySelector("#portfolioFiles");
const uploadPreview = document.querySelector("#uploadPreview");
const portfolioForm = document.querySelector("#portfolioForm");

const clearPreviewUrls = () => {
  uploadPreview.querySelectorAll("img").forEach((image) => {
    URL.revokeObjectURL(image.src);
  });
};

if (portfolioFiles && uploadPreview) {
  portfolioFiles.addEventListener("change", () => {
    clearPreviewUrls();
    uploadPreview.replaceChildren();

    const files = Array.from(portfolioFiles.files).filter((file) => file.type.startsWith("image/"));

    if (!files.length) {
      const empty = document.createElement("div");
      empty.className = "preview-empty";
      empty.textContent = "尚未選擇照片";
      uploadPreview.append(empty);
      return;
    }

    files.slice(0, 8).forEach((file) => {
      const image = document.createElement("img");
      image.src = URL.createObjectURL(file);
      image.alt = file.name;
      uploadPreview.append(image);
    });
  });
}

if (portfolioForm) {
  portfolioForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const submitButton = portfolioForm.querySelector("button[type='submit']");
    if (!submitButton) return;

    submitButton.textContent = "作品草稿已建立";
    window.setTimeout(() => {
      submitButton.textContent = "建立作品草稿";
    }, 1800);
  });
}
