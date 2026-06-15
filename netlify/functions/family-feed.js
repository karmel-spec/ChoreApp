const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

async function signedPhotoUrl(supabase, storagePath) {
  if (!storagePath) return "";
  const { data, error } = await supabase.storage
    .from("family-photos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) return "";
  return data?.signedUrl || "";
}

async function childForPost(supabase, actor, body) {
  let query = supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name")
    .eq("family_id", actor.family_id)
    .eq("role", "child");
  if (body.childProfileKey) query = query.eq("profile_key", cleanText(body.childProfileKey).toLowerCase());
  else query = query.eq("id", body.childId || actor.id);
  const { data, error } = await query.single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

async function publicPosts(supabase, actor) {
  const { data: posts, error } = await supabase
    .from("family_feed_posts")
    .select("*")
    .eq("family_id", actor.family_id)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return { error };

  const postIds = (posts || []).map(post => post.id);
  const childIds = [...new Set((posts || []).map(post => post.child_id).filter(Boolean))];
  const actorIds = [];

  const { data: reactions, error: reactionError } = postIds.length
    ? await supabase
      .from("family_feed_reactions")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (reactionError) return { error: reactionError };
  (reactions || []).forEach(reaction => actorIds.push(reaction.actor_id));

  const memberIds = [...new Set([...childIds, ...actorIds].filter(Boolean))];
  const { data: members, error: memberError } = memberIds.length
    ? await supabase
      .from("family_members")
      .select("id,profile_key,display_name")
      .in("id", memberIds)
    : { data: [], error: null };
  if (memberError) return { error: memberError };

  const memberById = new Map((members || []).map(member => [member.id, member]));
  const reactionsByPost = (reactions || []).reduce((grouped, reaction) => {
    if (!grouped.has(reaction.post_id)) grouped.set(reaction.post_id, []);
    grouped.get(reaction.post_id).push(reaction);
    return grouped;
  }, new Map());

  const familyPhotoFeed = await Promise.all((posts || []).map(async post => {
    const child = memberById.get(post.child_id);
    const postReactions = reactionsByPost.get(post.id) || [];
    return {
      id: post.id,
      childId: child?.profile_key || "",
      childName: child?.display_name || "Family",
      choreName: post.chore_name,
      image: await signedPhotoUrl(supabase, post.image_path),
      imagePath: post.image_path,
      createdAt: post.created_at,
      likes: postReactions
        .filter(reaction => reaction.reaction_type === "like")
        .map(reaction => ({
          actorId: reaction.actor_id,
          by: memberById.get(reaction.actor_id)?.display_name || "Family",
          at: reaction.created_at
        })),
      comments: postReactions
        .filter(reaction => reaction.reaction_type === "comment")
        .map(reaction => ({
          actorId: reaction.actor_id,
          by: memberById.get(reaction.actor_id)?.display_name || "Family",
          text: reaction.comment_text || "Great work!",
          at: reaction.created_at
        }))
    };
  }));

  return { familyPhotoFeed };
}

async function createPost({ supabase, actor, body }) {
  const child = await childForPost(supabase, actor, body);
  if (!child) return json(404, { error: "Child profile not found for family feed post." });
  if (!requireAdmin(actor) && actor.id !== child.id) {
    return json(403, { error: "Children can create feed posts only for their own proof photos." });
  }

  const imagePath = cleanText(body.imagePath || body.storagePath);
  if (!imagePath || !imagePath.startsWith(`family/${actor.family_id}/`)) {
    return json(400, { error: "Family feed posts require a stored family photo path." });
  }

  const { data, error } = await supabase
    .from("family_feed_posts")
    .insert({
      family_id: actor.family_id,
      child_id: child.id,
      chore_record_id: body.choreRecordId || null,
      chore_name: cleanText(body.choreName, "Shared chore"),
      image_path: imagePath,
      created_by: actor.id
    })
    .select("id")
    .single();
  if (error) return json(500, { error: error.message });

  const read = await publicPosts(supabase, actor);
  if (read.error) return json(500, { error: read.error.message });
  return json(200, { postId: data.id, ...read });
}

async function addReaction({ supabase, actor, body }) {
  const postId = cleanText(body.postId);
  const reactionType = body.reactionType === "comment" ? "comment" : "like";
  const points = reactionType === "comment" ? 10 : 5;
  if (!postId) return json(400, { error: "Send the family feed post id." });

  const { data: post, error: postError } = await supabase
    .from("family_feed_posts")
    .select("id,family_id")
    .eq("id", postId)
    .single();
  if (postError || !post || post.family_id !== actor.family_id) {
    return json(404, { error: "Family feed post not found." });
  }

  const { error } = await supabase
    .from("family_feed_reactions")
    .insert({
      family_id: actor.family_id,
      post_id: post.id,
      actor_id: actor.id,
      reaction_type: reactionType,
      comment_text: reactionType === "comment" ? cleanText(body.commentText, "Great work!") : "",
      points
    });
  if (error?.code === "23505") return json(409, { error: "This family member already reacted to that post." });
  if (error) return json(500, { error: error.message });

  const read = await publicPosts(supabase, actor);
  if (read.error) return json(500, { error: read.error.message });
  return json(200, read);
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  const supabase = serviceClient();

  if (event.httpMethod === "GET") {
    const read = await publicPosts(supabase, actor);
    if (read.error) return json(500, { error: read.error.message });
    return json(200, read);
  }

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });
  if (event.httpMethod === "POST" && body.action === "create_post") return createPost({ supabase, actor, body });
  if (event.httpMethod === "POST" && body.action === "react") return addReaction({ supabase, actor, body });
  return json(405, { error: "Method not allowed" });
};
