let io = null;

function setIo(socketInstance) {
    io = socketInstance;
}

function getIo() {
    return io;
}

module.exports = {
    setIo,
    getIo,
};

