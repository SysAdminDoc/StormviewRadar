const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'WebGL shader compilation failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'WebGL shader linking failed';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export function tileQuad(rect, viewport, padding = 0) {
  const width = viewport.width + (padding * 2);
  const height = viewport.height + (padding * 2);
  const left = rect.left - viewport.left + padding;
  const top = rect.top - viewport.top + padding;
  const right = left + rect.width;
  const bottom = top + rect.height;
  const x1 = (left / width) * 2 - 1;
  const x2 = (right / width) * 2 - 1;
  const y1 = 1 - (top / height) * 2;
  const y2 = 1 - (bottom / height) * 2;
  return new Float32Array([
    x1, y1, 0, 1,
    x2, y1, 1, 1,
    x1, y2, 0, 0,
    x1, y2, 0, 0,
    x2, y1, 1, 1,
    x2, y2, 1, 0
  ]);
}

export class WebGLTileRenderer {
  constructor(layer, map, options = {}) {
    this.layer = layer;
    this.map = map;
    const padding = Number(options.padding ?? 256);
    this.padding = Number.isFinite(padding) ? Math.max(0, padding) : 256;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.buffer = null;
    this.positionLocation = -1;
    this.textureLocation = -1;
    this.textures = new Map();
    this.frame = null;
    this.destroyed = false;
    this.boundSchedule = () => this.schedule();
    this.boundDeactivate = () => this.deactivate();
  }

  mount() {
    if (this.destroyed || this.canvas || !this.layer?._container) return Boolean(this.gl);
    const canvas = document.createElement('canvas');
    canvas.className = 'webgl-tile-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.left = `${-this.padding}px`;
    canvas.style.top = `${-this.padding}px`;
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.deactivate();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.releaseGraphics();
      this.initializeGraphics();
      this.schedule();
    });
    this.layer._container.append(canvas);
    this.canvas = canvas;

    if (!this.initializeGraphics()) {
      canvas.remove();
      this.canvas = null;
      return false;
    }

    this.layer.on('tileload tileunload load', this.boundSchedule);
    this.map.on('moveend resize zoomend', this.boundSchedule);
    this.map.on('zoomstart', this.boundDeactivate);
    this.schedule();
    return true;
  }

  initializeGraphics() {
    if (!this.canvas) return false;
    try {
      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false
      });
      if (!gl) return false;
      const program = createProgram(gl);
      const buffer = gl.createBuffer();
      this.gl = gl;
      this.program = program;
      this.buffer = buffer;
      this.positionLocation = gl.getAttribLocation(program, 'a_position');
      this.textureLocation = gl.getAttribLocation(program, 'a_texCoord');
      gl.useProgram(program);
      gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      return true;
    } catch {
      this.releaseGraphics();
      return false;
    }
  }

  schedule() {
    if (this.destroyed || !this.gl || this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }

  render() {
    if (this.destroyed || !this.gl || !this.map?.hasLayer(this.layer)) return false;
    const entries = Object.values(this.layer._tiles || {})
      .filter(entry => !entry.coords || entry.coords.z === this.layer._tileZoom);
    if (!entries.length || entries.some(entry => (
      !entry.el?.complete
      || !entry.el.classList.contains('leaflet-tile-loaded')
      || entry.el.naturalWidth < 1
    ))) {
      this.deactivate();
      return false;
    }

    const mapElement = this.map.getContainer();
    const viewport = mapElement.getBoundingClientRect();
    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const cssWidth = Math.ceil(viewport.width + (this.padding * 2));
    const cssHeight = Math.ceil(viewport.height + (this.padding * 2));
    const width = Math.ceil(cssWidth * pixelRatio);
    const height = Math.ceil(cssHeight * pixelRatio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.width = `${cssWidth}px`;
      this.canvas.style.height = `${cssHeight}px`;
    }

    const gl = this.gl;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const currentImages = new Set(entries.map(entry => entry.el));
    for (const [image, texture] of this.textures) {
      if (currentImages.has(image)) continue;
      gl.deleteTexture(texture);
      this.textures.delete(image);
    }

    let rendered = 0;
    try {
      for (const entry of entries) {
        const image = entry.el;
        const rect = image.getBoundingClientRect();
        if (rect.right < viewport.left - this.padding
          || rect.left > viewport.right + this.padding
          || rect.bottom < viewport.top - this.padding
          || rect.top > viewport.bottom + this.padding) continue;
        const texture = this.textureFor(image);
        const vertices = tileQuad(rect, viewport, this.padding);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(this.textureLocation);
        gl.vertexAttribPointer(this.textureLocation, 2, gl.FLOAT, false, 16, 8);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        rendered += 1;
      }
    } catch {
      this.deactivate();
      return false;
    }

    this.canvas.dataset.renderedTiles = String(rendered);
    this.canvas.dataset.renderer = 'webgl';
    this.layer._container.classList.toggle('webgl-active', rendered > 0);
    return rendered > 0;
  }

  textureFor(image) {
    let texture = this.textures.get(image);
    if (texture) return texture;
    const gl = this.gl;
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    this.textures.set(image, texture);
    return texture;
  }

  deactivate() {
    this.layer?._container?.classList.remove('webgl-active');
  }

  releaseGraphics() {
    if (!this.gl) return;
    this.textures.forEach(texture => this.gl.deleteTexture(texture));
    this.textures.clear();
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    if (this.program) this.gl.deleteProgram(this.program);
    this.buffer = null;
    this.program = null;
    this.gl = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.deactivate();
    this.layer?.off('tileload tileunload load', this.boundSchedule);
    this.map?.off('moveend resize zoomend', this.boundSchedule);
    this.map?.off('zoomstart', this.boundDeactivate);
    const loseContext = this.gl?.getExtension('WEBGL_lose_context');
    this.releaseGraphics();
    loseContext?.loseContext();
    this.canvas?.remove();
    this.canvas = null;
  }
}
