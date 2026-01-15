# bun-react-tailwind-template

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

## Docker Support

This project includes Docker support for deployment on various platforms.

### Building and Running with Docker

```bash
docker-compose up --build
```

### Synology NAS / Older CPUs

The Dockerfile uses the Bun baseline build to support older CPUs without AVX2 instructions (such as Intel Celeron processors found in Synology NAS devices like the DS 220+). This resolves SIGILL (Illegal Instruction) errors that occur with the standard Bun Docker image.

If you're running on modern hardware with AVX2 support, you may achieve better performance by switching to the official `oven/bun:1` image in the Dockerfile.

---

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
