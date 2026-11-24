// input.js — keyboard + mouse state for the canvas game.
// Keys are tracked by event.code so WASD and arrows both work, and every
// keydown that is not a repeat is remembered once per frame (justPressed)
// so actions like E and F fire exactly once per tap.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    justPressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    anyKey: false,
  };

  function canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    if (gameKeys.includes(event.code)) event.preventDefault();
    if (!event.repeat) {
      input.justPressed.add(event.code);
      input.anyKey = true;
    }
    input.keys.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPos(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  });

  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPos(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.down = true;
    input.mouse.clicked = true;
    input.anyKey = true;
  });

  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  // Basic touch support: a tap is a click, a drag moves the aim point.
  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    const p = canvasPos(touch);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.down = true;
    input.mouse.clicked = true;
    input.anyKey = true;
  }, { passive: false });

  canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    const p = canvasPos(touch);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    input.mouse.down = false;
  });

  // Call once at the end of each frame so justPressed only lives one frame.
  input.endFrame = function endFrame() {
    input.justPressed.clear();
    input.mouse.clicked = false;
    input.anyKey = false;
  };

  input.down = function down(...codes) {
    return codes.some((c) => input.keys.has(c));
  };

  input.pressed = function pressed(...codes) {
    return codes.some((c) => input.justPressed.has(c));
  };

  // Movement vector from WASD or arrow keys, normalized to length 1.
  input.moveVector = function moveVector() {
    let x = 0;
    let y = 0;
    if (input.down('KeyA', 'ArrowLeft')) x -= 1;
    if (input.down('KeyD', 'ArrowRight')) x += 1;
    if (input.down('KeyW', 'ArrowUp')) y -= 1;
    if (input.down('KeyS', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  };

  return input;
}
