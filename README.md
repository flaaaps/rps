# rock-paper-scissors
Show off your skills in the most iconic game ever!

<img src="https://i.imgur.com/pMCpZ6n.png" width="70%" />

## Docker Support

This project includes Docker support for easy deployment.

### Building the Docker Image

```bash
docker build -t rock-paper-scissors .
```

### Running the Container

```bash
docker run -p 7332:7332 rock-paper-scissors
```

The application will be available at http://localhost:7332/game?id=your-game-id
