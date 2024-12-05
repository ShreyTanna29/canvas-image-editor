const canvas = document.getElementById("editor-canvas");
const animationCanvas = document.getElementById("animation-canvas");
const ctx = canvas.getContext("2d");
const animCtx = animationCanvas.getContext("2d");
const textBox = document.getElementById("text-box");
const themeToggle = document.getElementById("theme-toggle");
let isDarkMode = localStorage.getItem("darkMode") === "true";

function updateTheme() {
  document.documentElement.setAttribute(
    "data-theme",
    isDarkMode ? "dark" : "light"
  );
  localStorage.setItem("darkMode", isDarkMode);
}

themeToggle.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  updateTheme();
});

updateTheme();

const images = ["./images/img1.jpg", "./images/img2.jpg", "./images/img3.jpg"];
let currentImageIndex = 0;
const bgImage = new Image();

let activeText = null;
const texts = [];
let isSwiping = false;
let swipeStartX = 0;
let isResizing = false;
let currentHandle = null;
let isDragging = false;
let isMouseDown = false;

function isTextOverlapping(newText, existingTexts, ctx) {
  const newBounds = {
    x: newText.x,
    y: newText.y - newText.size,
    width: ctx.measureText(newText.text).width,
    height: newText.size,
  };

  for (const text of existingTexts) {
    const textBounds = {
      x: text.x,
      y: text.y - text.size,
      width: ctx.measureText(text.text).width,
      height: text.size,
    };

    if (
      newBounds.x < textBounds.x + textBounds.width &&
      newBounds.x + newBounds.width > textBounds.x &&
      newBounds.y < textBounds.y + textBounds.height &&
      newBounds.y + newBounds.height > textBounds.y
    ) {
      return true;
    }
  }
  return false;
}

function updateControlsWithActiveText() {
  if (activeText) {
    document.getElementById("text-input").value = activeText.text;
    document.getElementById("color-picker").value = activeText.color;
    document.getElementById("font-family").value = activeText.font;
    document.getElementById("font-size").value = activeText.size;
    document.getElementById("delete-text").style.display = "inline-block";
  } else {
    document.getElementById("text-input").value = "";
  }
}

function findSafePosition(newText, texts, ctx) {
  const padding = 20;
  let position = { ...newText };

  if (texts.length === 0) return position;

  while (isTextOverlapping(position, texts, ctx)) {
    position.y += padding;

    if (position.y > canvas.height - padding) {
      position.y = padding + position.size;
      position.x += padding;

      if (position.x > canvas.width - padding) {
        position.x = padding;
      }
    }
  }

  return position;
}

function showTextBox(text) {
  ctx.font = `${text.size}px ${text.font}`;
  const textWidth = ctx.measureText(text.text).width;
  const textHeight = text.size;

  textBox.style.display = "block";
  textBox.style.left = `${text.x}px`;
  textBox.style.top = `${text.y - textHeight}px`;
  textBox.style.width = `${textWidth}px`;
  textBox.style.height = `${textHeight}px`;

  document.querySelectorAll(".resize-handle").forEach((handle) => {
    handle.style.display = "block";
  });
}

const loadImage = (index) => {
  bgImage.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    redrawTexts();
  };
  bgImage.src = images[index];
};

const redrawTexts = () => {
  texts.forEach((text) => {
    ctx.font = `${text.size}px ${text.font}`;
    ctx.fillStyle = text.color;

    const maxWidth = canvas.width - text.x;
    const lines = wrapText(text, maxWidth);

    lines.forEach((line, index) => {
      const lineY = text.y + index * (text.size + 5);
      ctx.fillText(line, text.x, lineY);
    });
  });
};

const animateSwipe = (direction) => {
  const nextImageIndex =
    direction === "left"
      ? (currentImageIndex + 1) % images.length
      : (currentImageIndex - 1 + images.length) % images.length;

  const nextImage = new Image();
  nextImage.src = images[nextImageIndex];

  nextImage.onload = () => {
    const distance = canvas.width;
    let offset = 0;
    const step = distance / 20;

    const animate = () => {
      animCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
      animCtx.drawImage(bgImage, offset, 0, canvas.width, canvas.height);
      animCtx.drawImage(
        nextImage,
        offset + (direction === "left" ? distance : -distance),
        0,
        canvas.width,
        canvas.height
      );

      offset += direction === "left" ? -step : step;

      if (Math.abs(offset) < distance) {
        requestAnimationFrame(animate);
      } else {
        bgImage.src = images[nextImageIndex];
        currentImageIndex = nextImageIndex;
        setTimeout(() => {
          animCtx.clearRect(
            0,
            0,
            animationCanvas.width,
            animationCanvas.height
          );
        }, 50);
      }
    };

    animate();
  };
};

function wrapText(text, maxWidth) {
  const words = text.text.split(" ");
  const lines = [];
  let currentLine = words[0];

  ctx.font = `${text.size}px ${text.font}`;

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function showTextBox(text) {
  ctx.font = `${text.size}px ${text.font}`;
  const maxWidth = canvas.width - text.x;
  const lines = wrapText(text, maxWidth);

  let maxLineWidth = 0;
  lines.forEach((line) => {
    const lineWidth = ctx.measureText(line).width;
    maxLineWidth = Math.max(maxLineWidth, lineWidth);
  });

  const totalHeight = lines.length * (text.size + 5) - 5;

  textBox.style.display = "block";
  textBox.style.left = `${text.x}px`;
  textBox.style.top = `${text.y - text.size}px`;
  textBox.style.width = `${maxLineWidth}px`;
  textBox.style.height = `${totalHeight}px`;

  document.querySelectorAll(".resize-handle").forEach((handle) => {
    handle.style.display = "block";
  });
}

window.addEventListener("keydown", (e) => {
  if (
    (e.key === "Delete" || e.key === "Backspace") &&
    activeText &&
    !isEditing
  ) {
    const index = texts.indexOf(activeText);
    if (index > -1) {
      texts.splice(index, 1);
    }
    activeText = null;
    textBox.style.display = "none";
    redrawCanvas();
  }
});

function isTextOverlapping(newText, existingTexts, ctx) {
  const newBounds = {
    x: newText.x,
    y: newText.y - newText.size,
    width: ctx.measureText(newText.text).width,
    height: newText.size,
  };

  for (const text of existingTexts) {
    const textBounds = {
      x: text.x,
      y: text.y - text.size,
      width: ctx.measureText(text.text).width,
      height: text.size,
    };

    if (
      newBounds.x < textBounds.x + textBounds.width &&
      newBounds.x + newBounds.width > textBounds.x &&
      newBounds.y < textBounds.y + textBounds.height &&
      newBounds.y + newBounds.height > textBounds.y
    ) {
      return true;
    }
  }
  return false;
}

function findSafePosition(newText, texts, ctx) {
  const padding = 20;
  let position = { ...newText };

  while (isTextOverlapping(position, texts, ctx)) {
    position.y += padding;

    if (position.y > canvas.height - padding) {
      position.y = padding + position.size;
      position.x += padding;

      if (position.x > canvas.width - padding) {
        position.x = padding;
      }
    }
  }

  return position;
}

document.getElementById("add-text").addEventListener("click", () => {
  const textInput = document.getElementById("text-input").value;
  const color = document.getElementById("color-picker").value;
  const fontSize = parseInt(document.getElementById("font-size").value);
  const fontFamily = document.getElementById("font-family").value;

  if (textInput) {
    ctx.font = `${fontSize}px ${fontFamily}`;

    const newText = {
      text: textInput,
      color: color,
      size: fontSize,
      font: fontFamily,
      x: 50,
      y: 50 + fontSize,
    };

    const safePosition = findSafePosition(newText, texts, ctx);

    texts.push({
      ...newText,
      x: safePosition.x,
      y: safePosition.y,
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    redrawTexts();
  }
});

document.querySelectorAll(".resize-handle").forEach((handle) => {
  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    isResizing = true;
    isMouseDown = true;
    currentHandle = handle.classList[1];
  });
});

canvas.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  activeText = texts.find((text) => {
    const textWidth = ctx.measureText(text.text).width;
    return (
      x >= text.x &&
      x <= text.x + textWidth &&
      y <= text.y &&
      y >= text.y - text.size
    );
  });

  if (activeText) {
    showTextBox(activeText);
    isDragging = true;
    canvas.classList.add("dragging");
  } else {
    textBox.style.display = "none";
    swipeStartX = x;
    isSwiping = true;
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (!isMouseDown) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (isResizing && activeText) {
    const newSize = Math.max(
      12,
      Math.min(96, mouseY - activeText.y + activeText.size)
    );
    activeText.size = newSize;
  } else if (activeText && isDragging) {
    ctx.font = `${activeText.size}px ${activeText.font}`;
    const textMetrics = ctx.measureText(activeText.text);
    const textWidth = textMetrics.width;

    const minVisiblePortion = textWidth;

    const minX = -textWidth + minVisiblePortion;
    const maxX = canvas.width - minVisiblePortion;
    const minY = activeText.size;
    const maxY = canvas.height;

    const newX = Math.max(minX, Math.min(mouseX - textWidth / 3, maxX));
    const newY = Math.max(minY, Math.min(mouseY, maxY));

    activeText.x = newX;
    activeText.y = newY;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  redrawTexts();
  if (activeText) {
    showTextBox(activeText);
  }
});

window.addEventListener("mouseup", (e) => {
  isMouseDown = false;
  canvas.classList.remove("dragging");

  if (isSwiping) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const swipeThreshold = 50;

    if (Math.abs(x - swipeStartX) > swipeThreshold) {
      if (x < swipeStartX) {
        animateSwipe("left");
      } else {
        animateSwipe("right");
      }
    }
  }

  isDragging = false;
  isResizing = false;
  currentHandle = null;
  isSwiping = false;
});

document.addEventListener("click", (e) => {
  if (
    !e.target.closest("#canvas-container") &&
    !e.target.closest(".text-box")
  ) {
    textBox.style.display = "none";
    activeText = null;
    canvas.classList.remove("dragging");
  }
});

loadImage(currentImageIndex);
