import { http, HttpResponse } from "msw";
import { db } from "./db";
import issueTemplate from "./issue-template";

/**
 * Intercepts the routes and returns a custom payload
 */
export const handlers = [
  // get repo
  http.get("https://api.github.com/repos/:owner/:repo", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) => {
    const item = db.repo.findFirst({ where: { name: { equals: repo }, owner: { login: { equals: owner } } } });
    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(item);
  }),
  //get member
  http.get("https://api.github.com/orgs/:org/memberships/:username", ({ params: { username } }) => {
    const user = db.users.findFirst({ where: { login: { equals: username as string } } });
    if (user) {
      return HttpResponse.json({ role: user.role });
    } else {
      return HttpResponse.json({ role: "collaborator" });
    }
  }),
  // get issue
  http.get("https://api.github.com/repos/:owner/:repo/issues", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) =>
    HttpResponse.json(db.issue.findMany({ where: { owner: { equals: owner }, repo: { equals: repo } } }))
  ),
  // create issue
  http.post("https://api.github.com/repos/:owner/:repo/issues", () => {
    const id = db.issue.count() + 1;
    const newItem = { ...issueTemplate, id };
    db.issue.create(newItem);
    return HttpResponse.json(newItem);
  }),
  // get repo issues
  http.get("https://api.github.com/orgs/:org/repos", ({ params: { org } }: { params: { org: string } }) =>
    HttpResponse.json(db.repo.findMany({ where: { owner: { login: { equals: org } } } }))
  ),
  // add comment to issue
  http.post("https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments", ({ params: { owner, repo, issue_number: issueNumber } }) =>
    HttpResponse.json({ owner, repo, issueNumber })
  ),
  // get commit
  http.get("https://api.github.com/repos/:owner/:repo/commits/:ref", () =>
    HttpResponse.json({
      data: {
        sha: "commitHash",
      },
    })
  ),
  // list pull requests
  http.get("https://api.github.com/repos/:owner/:repo/pulls", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) =>
    HttpResponse.json(db.pull.findMany({ where: { owner: { equals: owner }, repo: { equals: repo } } }))
  ),
  // list events for an issue timeline
  http.get("https://api.github.com/repos/:owner/:repo/issues/:issue_number/timeline", () => HttpResponse.json(db.event.getAll())),
  // update a pull request
  http.patch("https://api.github.com/repos/:owner/:repo/pulls/:pull_number", ({ params: { owner, repo, pull_number: pullNumber } }) =>
    HttpResponse.json({ owner, repo, pullNumber })
  ),
  // add assignee to an issue
  http.post(
    "https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees",
    async ({ params: { owner, repo, issue_number: issueNumber }, request: { body } }) => {
      const reader = body?.getReader();
      if (!reader) {
        return HttpResponse.json({ owner, repo, issueNumber });
      }
      const { assignees } = await reader.read().then(({ value }) => {
        return JSON.parse(new TextDecoder().decode(value));
      });

      const issue = db.issue.findFirst({
        where: { owner: { equals: owner as string }, repo: { equals: repo as string }, number: { equals: Number(issueNumber) } },
      });

      if (issue) {
        db.issue.update({
          where: { id: { equals: issue.id } },
          data: {
            assignees: [...issue.assignees, ...assignees],
          },
        });
      }

      return HttpResponse.json({ owner, repo, issueNumber, assignees });
    }
  ),
  // list all pull requests
  http.get("https://api.github.com/repos/:owner/:repo/pulls", ({ params: { owner, repo } }) =>
    HttpResponse.json(db.pull.findMany({ where: { owner: { equals: owner as string }, repo: { equals: repo as string } } }))
  ),
  // get commit hash
  http.get("https://api.github.com/repos/:owner/:repo/commits", () => HttpResponse.json({ sha: "commitHash" })),
  // list all pull request reviews
  http.get("https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews", () => HttpResponse.json(db.review.getAll())),
  // remove assignee from an issue
  http.delete("https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees", ({ params: { owner, repo, issue_number: issueNumber } }) =>
    HttpResponse.json({ owner, repo, issueNumber })
  ),
  http.get("https://api.github.com/search/issues", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const query = params.get("q");
    const hasAssignee = query?.includes("assignee");
    if (hasAssignee) {
      return HttpResponse.json(db.issue.getAll());
    } else {
      return HttpResponse.json(db.pull.getAll());
    }
  }),
  // get issue by number
  http.get("https://api.github.com/repos/:owner/:repo/issues/:issue_number", ({ params: { owner, repo, issue_number: issueNumber } }) =>
    HttpResponse.json(
      db.issue.findFirst({
        where: { owner: { equals: owner as string }, repo: { equals: repo as string }, number: { equals: Number(issueNumber) } },
      })
    )
  ),
  // get user
  http.get("https://api.github.com/users/:username", ({ params: { username } }) => {
    const user = db.users.findFirst({ where: { login: { equals: username as string } } });
    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(user);
  }),
  // get comments for an issue
  http.get("https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments", () => HttpResponse.json(db.comments.getAll())),
  // list installations
  http.get("https://api.github.com/app/installations", () => HttpResponse.json([
      {
        login: "test-repo",
      },
    ]
  )),
];
