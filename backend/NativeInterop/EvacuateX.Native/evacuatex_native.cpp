#include "evacuatex_native.h"
#include <vector>
#include <queue>
#include <limits>

EXTERN int32_t ex_find_path_stub(EXPoint start, EXPoint goal, EXPoint* outPath, int32_t maxPathLen)
{
    if (!outPath || maxPathLen <=0)
    {
        return -1;
    }

    int32_t n=0;

    int dx = (goal.x >= start.x) ? 1: -1;
    for (int x = start.x; x != goal.x && n < maxPathLen; x += dx)
        outPath[n++] = { x, start.y };
    if (n < maxPathLen) outPath[n++] = { goal.x, start.y };

    int dy = (goal.y >= start.y) ? 1 : -1;
    for (int y = start.y; y != goal.y && n < maxPathLen; y += dy)
        outPath[n++] = { goal.x, y };
    if (n < maxPathLen) outPath[n++] = { goal.x, goal.y };

    return n;
}

EXTERN int32_t ex_find_path_grid(
    const uint8_t* grid,
    int32_t width,
    int32_t height,
    EXPoint start,
    EXPoint goal,
    EXPoint* outPath,
    int32_t maxPathLen)
{
    if (!grid || !outPath || maxPathLen <=0) return 0;

    auto index = [width](int x, int y)
    {
        return y * width + x;
    };

    auto inBounds = [width, height](int x, int y)
    {
        return x>=0 && y>=00 && x<width && y<height;
    };

    auto heuristic = [](int x1, int y1, int x2, int y2)
    {
        return abs(x1 - x2) + abs(y1-y2);
    };

    struct Node
    {
        int x, y,g,f;
    };

    struct Compare
    {
        bool operator()(const Node& a, const Node& b)
        {
            return a.f > b.f;
        }
    };

    std::priority_queue<Node, std::vector<Node>, Compare> open;
    std::vector<int> gScore(width*height, INT_MAX);
    std::vector<int> cameFrom(width * height, -1);
    std::vector<bool> closed(width*height, false);

    int startIdx = index(start.x, start.y);
    int goalIdx = index(goal.x, goal.y);

    gScore[startIdx] = 0;
    open.push({start.x, start.y, 0, heuristic(start.x, start.y, goal.x, goal.y)});

    int dx[4] = {1,-1,0,0};
    int dy[4] = {0,0,1,-1};

    while (!open.empty())
    {
        auto current = open.top();
        open.pop();

        int cx = current.x;
        int cy = current.y;
        int cidx = index(cx, cy);

        if (cidx == goalIdx)
        {
            int count = 0;
            int cur = goalIdx;
            
            while (cur != -1 && count < maxPathLen)
            {
                int x = cur % width;
                int y = cur /width;
                outPath[count++] = {x,y};
                cur = cameFrom[cur];
            }

            //reverse path
            for (int i = 0; i < count / 2; i++) {
                std::swap(outPath[i], outPath[count - i - 1]);
            }

            return count;
        }

        for (int i = 0; i < 4; i++) 
        {
            int nx = cx + dx[i];
            int ny = cy + dy[i];

            if (!inBounds(nx, ny)) continue;
            if (grid[index(nx, ny)] == 1) continue;

            int nidx = index(nx, ny);
            int tentative_g = gScore[cidx] + 1;

            if (tentative_g < gScore[nidx]) {
                cameFrom[nidx] = cidx;
                gScore[nidx] = tentative_g;

                int f = tentative_g + heuristic(nx, ny, goal.x, goal.y);
                open.push({nx, ny, tentative_g, f});
            }
        }
    }

    return 0; //if there is no path accordingly.
}