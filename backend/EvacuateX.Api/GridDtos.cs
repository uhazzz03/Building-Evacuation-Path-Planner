public record GridPathRequest(
    //dimesnions of the grid
    int width,
    int height,
    byte[] cells,   //flat byte array with width*height entries and 1 wall, 0 is empty cell.
    PointDto start,
    PointDto goal
);

public record GridPathResponse(PointDto[] path, bool found);    //Reponse includes path ponits and a found flag.